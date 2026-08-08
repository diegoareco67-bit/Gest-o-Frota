import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { Sidebar } from "../../components/layout/Sidebar";
import { PainelAvisos } from "../../components/PainelAvisos";
import { SkeletonGrade } from "../../components/Skeleton";
import { IcoCarro, IcoDinheiro, IcoDocumento, IcoPorta, IcoMonitor, IcoChave } from "../../components/Icone";
import { cor, raio, texto, peso, espaco, sombra } from "../../design/tokens";
import { base, gridAuto } from "../../design/estilos";

/**
 * Tela inicial do perfil administrativo (SUAD).
 *
 * O foco é o que esse perfil precisa ver primeiro: boletins de indenização aguardando
 * conferência e termos de opção aguardando decisão. É a resposta ao problema de "como
 * a pessoa sabe que chegou documento novo sem olhar todo dia" — o e-mail não é canal
 * viável aqui (ver PLANO.md, pendência 14).
 */
export default function DashboardAdministrativo() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [contagem, setContagem] = useState({ boletins: 0, termosPendentes: 0, veiculos: 0, salas: 0, equipamentos: 0 });

  useEffect(() => {
    async function carregar() {
      try {
        const [ind, termos, veic, salas, equip] = await Promise.all([
          getDocs(query(collection(db, "indenizacoes"), limit(500))),
          getDocs(query(collection(db, "veiculosProprios"), where("status", "==", "pendente"), limit(200))),
          getDocs(query(collection(db, "veiculos"), limit(200))),
          getDocs(query(collection(db, "salas"), limit(200))),
          getDocs(query(collection(db, "equipamentos"), limit(200))),
        ]);
        setContagem({
          boletins: ind.size, termosPendentes: termos.size,
          veiculos: veic.size, salas: salas.size, equipamentos: equip.size,
        });
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const cards = [
    { icone: <IcoDinheiro tam={18} />, rotulo: "Boletins de indenização", valor: contagem.boletins, sub: "recebidos no sistema", destino: "/gestor/indenizacoes" },
    { icone: <IcoDocumento tam={18} />, rotulo: "Termos aguardando", valor: contagem.termosPendentes, sub: "para aprovar ou recusar", destino: "/gestor/indenizacoes" },
    { icone: <IcoCarro tam={18} />, rotulo: "Veículos", valor: contagem.veiculos, sub: "na frota", destino: "/gestor/veiculos" },
    { icone: <IcoPorta tam={18} />, rotulo: "Salas", valor: contagem.salas, sub: "cadastradas", destino: "/salas" },
    { icone: <IcoMonitor tam={18} />, rotulo: "Equipamentos", valor: contagem.equipamentos, sub: "no catálogo", destino: "/equipamentos" },
    { icone: <IcoChave tam={18} />, rotulo: "Manutenção", valor: null, sub: "registrar e acompanhar", destino: "/gestor/manutencao" },
  ];

  return (
    <div style={base.page}>
      <Sidebar perfil="administrativo" />
      <main style={base.main}>
        <div style={base.topbar}>
          <div>
            <div style={base.title}>{saudacao}, {usuario?.nome?.split(" ")[0] || "Administrativo"}!</div>
            <div style={base.sub}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
        </div>

        <div style={base.content}>
          <PainelAvisos uid={usuario?.uid} perfil="administrativo" />

          {carregando ? (
            <SkeletonGrade itens={6} />
          ) : (
            <div style={gridAuto("md")}>
              {cards.map(c => (
                <button key={c.rotulo} onClick={() => navigate(c.destino)} style={estilo.card}>
                  <span style={estilo.icone}>{c.icone}</span>
                  <div style={{ textAlign: "left" }}>
                    {c.valor !== null && (
                      <div style={{ fontSize: texto.xxl, fontWeight: peso.forte, color: cor.textoForte, lineHeight: 1 }}>{c.valor}</div>
                    )}
                    <div style={{ fontSize: texto.md, fontWeight: peso.forte, color: cor.texto, marginTop: c.valor !== null ? 6 : 0 }}>{c.rotulo}</div>
                    <div style={{ fontSize: texto.sm, color: cor.textoFraco, marginTop: 2 }}>{c.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const estilo: Record<string, React.CSSProperties> = {
  card: {
    background: cor.superficie, border: `1px solid ${cor.borda}`, borderRadius: raio.lg,
    padding: espaco.x5, boxShadow: sombra.card, cursor: "pointer",
    display: "flex", flexDirection: "column", gap: espaco.x3, alignItems: "flex-start", width: "100%",
  },
  icone: {
    width: 38, height: 38, borderRadius: raio.md, background: cor.accentBgSuave,
    color: cor.accent, display: "flex", alignItems: "center", justifyContent: "center",
  },
};
