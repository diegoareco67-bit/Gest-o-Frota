import { useCallback, useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Detecta novidades relevantes para o perfil e avisa o usuário.
 *
 * Existe porque o e-mail não é um canal viável neste ambiente: o servidor da CGE
 * (`snwl.ms.gov.br`, appliance de segurança, SPF `-all`) barra mensagens automáticas
 * vindas de fora, e mexer nisso depende da TI. Então o aviso acontece dentro do
 * próprio sistema.
 *
 * A detecção compara o estado atual com o último estado que o usuário viu, guardado
 * em `localStorage`. Não exige campo novo no Firestore nem migração — e funciona
 * mesmo para documentos criados antes desta funcionalidade.
 *
 * O mesmo mecanismo serve para os dois canais de entrega:
 *  - aviso na tela (sempre)
 *  - notificação do navegador (quando o usuário autoriza)
 * Trocar/adicionar canal — push via FCM, por exemplo — é ligar em `dispararNotificacao`.
 */

export interface Aviso {
  id: string;
  titulo: string;
  descricao: string;
  destino: string;              // rota para onde levar ao clicar
  tipo: "sucesso" | "atencao";
}

/** Intervalo de verificação. Mesmo padrão do CalendarioGrade (recarga periódica). */
const INTERVALO_MS = 60_000;

function chaveEstado(uid: string) { return `hub:avisos-vistos:${uid}`; }

function lerVistos(uid: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(chaveEstado(uid)) || "{}"); }
  catch { return {}; }
}

function gravarVistos(uid: string, estado: Record<string, string>) {
  try { localStorage.setItem(chaveEstado(uid), JSON.stringify(estado)); } catch { /* modo privado */ }
}

export function usePermissaoNotificacao() {
  const suportado = typeof window !== "undefined" && "Notification" in window;
  const [permissao, setPermissao] = useState<NotificationPermission | "indisponivel">(
    suportado ? Notification.permission : "indisponivel"
  );

  const pedirPermissao = useCallback(async () => {
    if (!suportado) return;
    const r = await Notification.requestPermission();
    setPermissao(r);
  }, [suportado]);

  return { permissao, pedirPermissao, suportado };
}

/** Dispara a notificação do navegador, se autorizada. Falha em silêncio se não. */
function dispararNotificacao(aviso: Aviso) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(aviso.titulo, {
      body: aviso.descricao,
      icon: "/icone-192.png",
      tag: aviso.id,          // evita empilhar a mesma notificação
    });
    n.onclick = () => { window.focus(); window.location.href = aviso.destino; };
  } catch { /* alguns navegadores bloqueiam fora de gesto do usuário */ }
}

interface Opcoes {
  uid?: string;
  perfil?: string;
  /** Desliga a notificação do navegador (usado nos testes) */
  semNotificacao?: boolean;
}

export function useAvisos({ uid, perfil, semNotificacao = false }: Opcoes) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const primeiraCarga = useRef(true);

  const verificar = useCallback(async () => {
    if (!uid || !perfil) return;

    const vistos = lerVistos(uid);
    const novoEstado: Record<string, string> = {};
    const encontrados: Aviso[] = [];

    try {
      if (perfil === "usuario") {
        // Condutor: solicitações dele que já foram decididas pelo gestor
        const snap = await getDocs(query(
          collection(db, "solicitacoes"),
          where("condutorId", "==", uid),
          limit(200),
        ));
        snap.forEach(d => {
          const s = d.data();
          const status = String(s.status ?? "");
          if (status !== "aprovada" && status !== "recusada") return;
          novoEstado[d.id] = status;
          if (vistos[d.id] === status) return;   // já viu esta decisão
          encontrados.push(
            status === "aprovada"
              ? {
                  id: d.id, tipo: "sucesso",
                  titulo: "Solicitação aprovada",
                  descricao: `Protocolo ${s.protocolo ?? ""} — veículo ${s.veiculoPlaca ?? ""} liberado para retirada.`,
                  destino: "/usuario/solicitacoes",
                }
              : {
                  id: d.id, tipo: "atencao",
                  titulo: "Solicitação recusada",
                  descricao: `Protocolo ${s.protocolo ?? ""} — ${s.motivoRecusa || "veja o motivo em Minhas Solicitações"}.`,
                  destino: "/usuario/solicitacoes",
                },
          );
        });
      }

      if (perfil === "gestor") {
        // Gestor: pedidos de acesso e termos de opção aguardando decisão
        const [acessos, termos] = await Promise.all([
          getDocs(query(collection(db, "solicitacoesAcesso"), where("status", "==", "pendente"), limit(200))),
          getDocs(query(collection(db, "veiculosProprios"), where("status", "==", "pendente"), limit(200))),
        ]);
        acessos.forEach(d => {
          novoEstado[d.id] = "pendente";
          if (vistos[d.id]) return;
          encontrados.push({
            id: d.id, tipo: "atencao",
            titulo: "Novo pedido de acesso",
            descricao: `${d.data().nomeCompleto ?? "Servidor"} solicitou cadastro no sistema.`,
            destino: "/gestor/usuarios?aba=solicitacoes",
          });
        });
        termos.forEach(d => {
          novoEstado[d.id] = "pendente";
          if (vistos[d.id]) return;
          encontrados.push({
            id: d.id, tipo: "atencao",
            titulo: "Termo de Opção aguardando",
            descricao: `${d.data().servidorNome ?? "Servidor"} enviou o Anexo I para aprovação.`,
            destino: "/gestor/indenizacoes",
          });
        });
      }
    } catch (e) {
      // Sem permissão de leitura ou rede fora: aviso é acessório, não quebra a tela.
      console.warn("[avisos] não foi possível verificar novidades:", e);
      return;
    }

    setAvisos(encontrados);

    // Na primeira carga não notifica: o usuário acabou de abrir e veria um estouro
    // de notificações de coisas antigas. A partir daí, só o que for realmente novo.
    if (!primeiraCarga.current && !semNotificacao) {
      encontrados.forEach(dispararNotificacao);
    }
    primeiraCarga.current = false;

    // Só grava o que já era conhecido; o que é novo continua "não visto" até o
    // usuário dispensar, para o aviso não sumir sozinho da tela.
    gravarVistos(uid, { ...vistos, ...Object.fromEntries(
      Object.entries(novoEstado).filter(([id]) => !encontrados.some(a => a.id === id))
    ) });
  }, [uid, perfil, semNotificacao]);

  useEffect(() => {
    // Falso positivo: `verificar` é assíncrona e só chama setState depois do await,
    // não de forma síncrona no corpo do efeito. Mesma regra experimental já suprimida
    // em Configuracoes.tsx pelo mesmo motivo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    verificar();
    const t = setInterval(verificar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [verificar]);

  /** Marca um aviso como visto — some da tela e não volta. */
  const dispensar = useCallback((id: string) => {
    if (!uid) return;
    const alvo = avisos.find(a => a.id === id);
    setAvisos(prev => prev.filter(a => a.id !== id));
    const vistos = lerVistos(uid);
    // Guarda o status que gerou o aviso, para uma decisão futura diferente avisar de novo
    gravarVistos(uid, { ...vistos, [id]: alvo?.tipo === "sucesso" ? "aprovada" : "recusada" });
  }, [uid, avisos]);

  const dispensarTodos = useCallback(() => {
    avisos.forEach(a => dispensar(a.id));
  }, [avisos, dispensar]);

  return { avisos, dispensar, dispensarTodos };
}
