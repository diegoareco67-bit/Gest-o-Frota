import { useEscClose } from "../hooks/useEscClose";

interface Props {
  titulo: string;
  mensagem: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  corConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ModalConfirm({
  titulo, mensagem,
  labelConfirmar = "Confirmar",
  labelCancelar  = "Cancelar",
  corConfirmar   = "#EF4444",
  onConfirmar, onCancelar,
}: Props) {
  useEscClose(onCancelar);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirm-titulo"
      style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)",
        backdropFilter:"blur(2px)", display:"flex", alignItems:"center",
        justifyContent:"center", zIndex:1000 }}
      onClick={e => { if (e.target === e.currentTarget) onCancelar(); }}
    >
      <div style={{ background:"#fff", borderRadius:14, padding:"1.75rem",
        width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
        fontFamily:"'Sora',system-ui,sans-serif" }}>
        <h2 id="modal-confirm-titulo" style={{ fontSize:17, fontWeight:700,
          color:"#0F172A", marginBottom:8, marginTop:0 }}>
          {titulo}
        </h2>
        <p style={{ fontSize:14, color:"#5A7A9A", marginBottom:"1.5rem", marginTop:0, lineHeight:1.5 }}>
          {mensagem}
        </p>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button
            onClick={onCancelar}
            autoFocus
            style={{ padding:"9px 20px", border:"1px solid #E1EAF5", borderRadius:8,
              background:"#F8FAFC", color:"#5A7A9A", fontSize:13, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit" }}>
            {labelCancelar}
          </button>
          <button
            onClick={onConfirmar}
            style={{ padding:"9px 20px", border:"none", borderRadius:8,
              background:corConfirmar, color:"#fff", fontSize:13, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit" }}>
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
