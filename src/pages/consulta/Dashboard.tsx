import { Sidebar } from "../../components/layout/Sidebar";
import { CalendarioGrade } from "../../components/CalendarioGrade";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_SALAS = {
  confirmada: { cor:"#3B82F6", label:"Reservada" },
  cancelada:  { cor:"#94A3B8", label:"Cancelada" },
};

const STATUS_EQUIPAMENTOS = {
  reservado: { cor:"#F59E0B", label:"Reservado" },
  retirado:  { cor:"#3B82F6", label:"Em uso" },
};

export default function DashboardConsulta() {
  const { usuario } = useAuth();

  return (
    <div style={s.page}>
      <Sidebar perfil="consulta" />
      <main style={s.main}>
        <header style={s.topbar}>
          <div>
            <h1 style={s.title}>Calendários</h1>
            <p style={s.sub}>Consulta em modo leitura · {usuario?.nome || "Consulta"}</p>
          </div>
        </header>

        <div style={s.content}>
          <div style={s.card}>
            <CalendarioGrade colecao="calendarioPublico" titulo="Frota — Veículos" subtitulo="Disponibilidade da frota oficial" tema="claro" campoTitulo="veiculoLabel" />
          </div>
          <div style={s.card}>
            <CalendarioGrade
              colecao="reservasSalas"
              titulo="Salas"
              subtitulo="Disponibilidade das salas de reunião"
              tema="claro"
              campoTitulo="salaNome"
              campoDataInicio="dataInicio"
              campoDataFim="dataFim"
              statusMap={STATUS_SALAS}
              statusFiltro={["confirmada"]}
            />
          </div>
          <div style={s.card}>
            <CalendarioGrade
              colecao="emprestimosEquipamentos"
              titulo="Equipamentos"
              subtitulo="Reservas e retiradas de equipamentos"
              tema="claro"
              campoTitulo="equipamentoNome"
              campoDataInicio="dataInicio"
              campoDataFim="dataFim"
              statusMap={STATUS_EQUIPAMENTOS}
              statusFiltro={["reservado", "retirado"]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora', system-ui, sans-serif" },
  main:    { flex:1, display:"flex", flexDirection:"column", minWidth:0, overflowY:"auto" },
  topbar:  { background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"16px 28px", flexShrink:0 },
  title:   { margin:0, fontSize:18, fontWeight:700, color:"#0F172A" },
  sub:     { margin:"3px 0 0", fontSize:12, color:"#7A95B2" },
  content: { padding:"24px 28px", flex:1, maxWidth:640, display:"flex", flexDirection:"column", gap:20 },
  card:    { background:"#ffffff", border:"1px solid #E1EAF5", borderRadius:12, padding:"1.25rem", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
};
