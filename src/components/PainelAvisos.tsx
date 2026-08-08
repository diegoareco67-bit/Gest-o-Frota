import { useNavigate } from "react-router-dom";
import { cor, raio, texto, peso, espaco } from "../design/tokens";
import { useAvisos, usePermissaoNotificacao } from "../hooks/useAvisos";
import { IcoCheckCirculo, IcoAlerta, IcoX } from "./Icone";

/**
 * Faixa de avisos no topo das telas iniciais.
 *
 * É o canal principal de notificação do sistema — o e-mail não é viável aqui, porque
 * o servidor da CGE barra mensagens automáticas externas (ver PLANO.md, pendência 14).
 *
 * Junto do aviso na tela, oferece ativar a notificação do navegador, que avisa mesmo
 * com a aba em segundo plano.
 */

interface Props {
  uid?: string;
  perfil?: string;
}

export function PainelAvisos({ uid, perfil }: Props) {
  const navigate = useNavigate();
  const { avisos, dispensar } = useAvisos({ uid, perfil });
  const { permissao, pedirPermissao, suportado } = usePermissaoNotificacao();

  // Só oferece ativar quando há algo a notificar — pedir permissão numa tela vazia
  // é o tipo de interrupção que faz o usuário negar por reflexo.
  const podeOferecerAtivar = suportado && permissao === "default" && avisos.length > 0;

  if (avisos.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: espaco.x2, marginBottom: espaco.x5 }}>
      {avisos.map(a => {
        const sucesso = a.tipo === "sucesso";
        return (
          <div
            key={a.id}
            style={{
              display: "flex", alignItems: "flex-start", gap: espaco.x3,
              background: sucesso ? "#F0FDF4" : cor.alertaBg,
              border: `1px solid ${sucesso ? "#BBF7D0" : "#FDE68A"}`,
              borderRadius: raio.md,
              padding: `${espaco.x3}px ${espaco.x4}px`,
            }}
          >
            <span style={{ color: sucesso ? cor.sucesso : cor.alerta, marginTop: 1, flexShrink: 0 }}>
              {sucesso ? <IcoCheckCirculo tam={16} /> : <IcoAlerta tam={16} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: texto.md, fontWeight: peso.forte, color: sucesso ? cor.sucesso : cor.alerta }}>
                {a.titulo}
              </div>
              <div style={{ fontSize: texto.base, color: cor.texto, marginTop: 2, lineHeight: 1.45 }}>
                {a.descricao}
              </div>
              <button
                type="button"
                onClick={() => { dispensar(a.id); navigate(a.destino); }}
                style={{
                  marginTop: espaco.x2, background: "none", border: "none", padding: 0,
                  color: cor.accent, fontSize: texto.base, fontWeight: peso.semi, cursor: "pointer",
                }}
              >
                Ver detalhes →
              </button>
            </div>
            <button
              type="button"
              onClick={() => dispensar(a.id)}
              aria-label="Dispensar aviso"
              title="Dispensar"
              style={{ background: "none", border: "none", cursor: "pointer", color: cor.textoMinimo, padding: 2, display: "flex" }}
            >
              <IcoX tam={14} />
            </button>
          </div>
        );
      })}

      {podeOferecerAtivar && (
        <button
          type="button"
          onClick={pedirPermissao}
          style={{
            alignSelf: "flex-start", background: cor.superficie, border: `1px solid ${cor.borda}`,
            borderRadius: raio.sm, padding: `6px ${espaco.x3}px`,
            fontSize: texto.sm, color: cor.textoSuave, cursor: "pointer",
          }}
        >
          Quer ser avisado assim que chegar algo novo? Ativar notificações deste navegador
        </button>
      )}
    </div>
  );
}
