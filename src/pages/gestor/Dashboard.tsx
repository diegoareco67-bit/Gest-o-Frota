import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Calendario from "../../components/Calendario";
import { CalendarioGrade } from "../../components/CalendarioGrade";
import { Sidebar } from "../../components/layout/Sidebar";
import { IcoCarro, IcoPessoa, IcoSirene } from "../../components/Icone";

const STATUS_SALAS = {
  confirmada: { cor:"#3B82F6", label:"Reservada" },
  cancelada:  { cor:"#94A3B8", label:"Cancelada" },
};

interface Stats {
  veiculosDisponiveis: number;
  veiculosEmUso: number;
  veiculosManutencao: number;
  solicitacoesPendentes: number;
  solicitacoesHoje: number;
  totalUsuarios: number;
}

interface SolAtrasada {
  id: string;
  protocolo: string;
  condutorNome: string;
  veiculoPlaca: string;
  dataRetorno: string;
  minutosAtraso: number;
}

export default function DashboardGestor() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ veiculosDisponiveis:0, veiculosEmUso:0, veiculosManutencao:0, solicitacoesPendentes:0, solicitacoesHoje:0, totalUsuarios:0 });
  const [atrasadas, setAtrasadas] = useState<SolAtrasada[]>([]);
  const [acessosPendentes, setAcessosPendentes] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [veiculos, solicitacoes, usuariosAtivos, acessosPendentes] = await Promise.all([
          getDocs(query(collection(db, "veiculos"), limit(200))),
          getDocs(query(collection(db, "solicitacoes"), limit(500))),
          getDocs(query(collection(db, "usuarios"), where("perfil","==","usuario"), where("ativo","==",true), limit(500))),
          getDocs(query(collection(db, "solicitacoesAcesso"), where("status","==","pendente"), limit(200))),
        ]);
        setAcessosPendentes(acessosPendentes.size);
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        let disponiveis=0, emUso=0, manutencao=0;
        veiculos.forEach(d => { const st=d.data().status; if(st==="disponivel") disponiveis++; else if(st==="em_uso") emUso++; else if(st==="manutencao") manutencao++; });
        let pendentes=0, solHoje=0;
        const agora = new Date();
        const listaAtrasadas: SolAtrasada[] = [];
        solicitacoes.forEach(d => {
          const s=d.data();
          if(s.status==="pendente") pendentes++;
          const criado=s.criadoEm?.toDate?.(); if(criado && criado>=hoje) solHoje++;
          if(s.status==="em_uso" && s.dataRetorno) {
            const retorno = new Date(s.dataRetorno);
            const minAtraso = Math.floor((agora.getTime() - retorno.getTime()) / 60000);
            if (minAtraso > 0) listaAtrasadas.push({ id:d.id, protocolo:s.protocolo||"", condutorNome:s.condutorNome||"", veiculoPlaca:s.veiculoPlaca||"", dataRetorno:s.dataRetorno, minutosAtraso:minAtraso });
          }
        });
        setAtrasadas(listaAtrasadas.sort((a,b)=>b.minutosAtraso-a.minutosAtraso));
        setStats({ veiculosDisponiveis:disponiveis, veiculosEmUso:emUso, veiculosManutencao:manutencao, solicitacoesPendentes:pendentes, solicitacoesHoje:solHoje, totalUsuarios:usuariosAtivos.size });
      } catch(e) { console.error(e); } finally { setCarregando(false); }
    }
    carregar();
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div style={s.page}>
      <Sidebar perfil="gestor" />
      <main style={s.main}>

        {/* Topbar */}
        <header style={s.topbar}>
          <div>
            <h1 style={s.greeting}>{saudacao}, {usuario?.nome?.split(" ")[0] || "Gestor"}!</h1>
            <p style={s.date}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
          </div>
          {stats.solicitacoesPendentes > 0 && (
            <button onClick={() => navigate("/gestor/aprovacoes")} style={s.alertBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {stats.solicitacoesPendentes} pendente{stats.solicitacoesPendentes>1?"s":""}
            </button>
          )}
        </header>

        <div style={s.content}>
          {carregando ? (
            <Spinner />
          ) : (
            <>
              {/* Alertas de atraso */}
              {atrasadas.length > 0 && (
                <div style={s.alertBox}>
                  <div style={s.alertHeader}>
                    <span style={{ fontSize:14 }}><IcoSirene tam={14}/></span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#991b1b" }}>
                      {atrasadas.length} veículo{atrasadas.length>1?"s":""} não devolvido{atrasadas.length>1?"s":""} no prazo
                    </span>
                  </div>
                  {atrasadas.map(a => {
                    const h = Math.floor(a.minutosAtraso/60), m = a.minutosAtraso%60;
                    const atrasoStr = h>0 ? `${h}h${m>0?` ${m}min`:""}` : `${m}min`;
                    return (
                      <div key={a.id} style={s.alertRow}>
                        <span style={{ fontSize:12, fontWeight:700, color:"#DC2626", minWidth:90 }}><IcoCarro tam={14}/> {a.veiculoPlaca}</span>
                        <span style={{ fontSize:12, color:"#64748b", flex:1 }}><IcoPessoa tam={14}/> {a.condutorNome}</span>
                        <span style={{ fontSize:11, color:"#991b1b", fontWeight:700, background:"#fee2e2", padding:"2px 10px", borderRadius:99 }}>+{atrasoStr} atraso</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* KPI Cards — grid 3 colunas × 2 linhas */}
              <div style={s.kpiGrid}>
                <StatCard accent="#1E3A8A" iconBg="#dbeafe" icon={<IcoCheck  color="#1E3A8A"/>} label="Disponíveis"valor={stats.veiculosDisponiveis}  sub="prontos para uso"onClick={() => navigate("/gestor/veiculos")} />
                <StatCard accent="#3B82F6" iconBg="#eff6ff" icon={<IcoTruck  color="#1563D5"/>} label="Em Uso"valor={stats.veiculosEmUso}         sub="circulando agora"onClick={() => navigate("/gestor/veiculos")} />
                <StatCard accent="#F59E0B" iconBg="#fef9c3" icon={<IcoWrench color="#B45309"/>} label="Manutenção"valor={stats.veiculosManutencao}    sub="em reparo"onClick={() => navigate("/gestor/manutencao")} />
                <StatCard accent="#EF4444" iconBg="#fee2e2" icon={<IcoAlert  color="#DC2626"/>} label="Pendentes"valor={stats.solicitacoesPendentes} sub="aguardando aprovação" onClick={() => navigate("/gestor/aprovacoes")} />
                <StatCard accent="#1E3A8A" iconBg="#dbeafe" icon={<IcoList   color="#1E3A8A"/>} label="Hoje"valor={stats.solicitacoesHoje}      sub="solicitações"onClick={() => navigate("/gestor/aprovacoes")} />
                <StatCard accent="#22C55E" iconBg="#dcfce7" icon={<IcoUsers  color="#166534"/>} label="Usuários"valor={stats.totalUsuarios}         sub="ativos"onClick={() => navigate("/gestor/usuarios")} />
              </div>

              {/* Bento inferior: calendário + ações rápidas */}
              <div style={s.bento}>
                {/* Calendários */}
                <div style={s.bentoLeft}>
                  <SectionTitle>Calendário de Agendamentos — Veículos</SectionTitle>
                  <div style={s.card}><Calendario /></div>

                  <div style={{ height:16 }} />

                  <div style={s.card}>
                    <CalendarioGrade
                      colecao="reservasSalas" detalhado titulo="Salas"subtitulo="Disponibilidade das salas de reunião"tema="claro"campoTitulo="salaNome"campoDataInicio="dataInicio"campoDataFim="dataFim"statusMap={STATUS_SALAS}
                      statusFiltro={["confirmada"]}
                    />
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div style={s.bentoRight}>
                  <SectionTitle>Ações Rápidas</SectionTitle>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {[
                      {label:"Aprovar Solicitações",   desc:"Gerencie pedidos pendentes",      path:"/gestor/aprovacoes",   cor:"#1E3A8A", Ico:IcoCheck},
                      {label:"Solicitações de Acesso", desc:"Novos cadastros aguardando",      path:"/gestor/usuarios?aba=solicitacoes", cor:"#1E3A8A", Ico:IcoUserPlus, badge:acessosPendentes},
                      {label:"Cadastrar Veículo",      desc:"Adicionar novo veículo à frota",  path:"/gestor/veiculos",     cor:"#22C55E", Ico:IcoTruck},
                      {label:"Salas",                  desc:"Calendário e reservas",           path:"/salas",               cor:"#1E3A8A", Ico:IcoDoor},
                      {label:"Equipamentos",           desc:"Notebooks, projetores...",        path:"/equipamentos",        cor:"#1E3A8A", Ico:IcoLaptop},
                      {label:"Indenizações",           desc:"Termos e boletins de viagem",     path:"/gestor/indenizacoes", cor:"#1E3A8A", Ico:IcoCash},
                      {label:"Agendar Manutenção",     desc:"Programar revisões e reparos",    path:"/gestor/manutencao",   cor:"#1E3A8A", Ico:IcoWrench},
                      {label:"Ver Relatórios",         desc:"Análise de uso da frota",         path:"/gestor/relatorios",   cor:"#3B82F6", Ico:IcoChart},
                    ].map(a => (
                      <button
                        key={a.path}
                        onClick={() => navigate(a.path)}
                        style={s.acaoCard}
                        aria-label={a.badge ? `${a.label} — ${a.badge} pendente${a.badge > 1 ? "s" : ""}` : a.label}
                      >
                        <span style={{...s.acaoIcon, background:a.cor+"18", position:"relative"}}>
                          <a.Ico color={a.cor}/>
                          {!!a.badge && <span style={s.acaoBadge}>{a.badge > 9 ? "9+" : a.badge}</span>}
                        </span>
                        <div style={{flex:1,textAlign:"left"}}>
                          <div style={s.acaoLabel}>{a.label}</div>
                          <div style={s.acaoDesc}>
                            {a.badge
                              ? `${a.badge} ${a.badge > 1 ? "pedidos aguardando" : "pedido aguardando"} aprovação`
                              : a.desc}
                          </div>
                        </div>
                        <span style={s.acaoArrow}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-componentes visuais ───────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin:"0 0 10px", fontSize:11, fontWeight:700, color:"#7A95B2", textTransform:"uppercase" as const, letterSpacing:"0.6px" }}>
      {children}
    </h2>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"5rem", gap:14, color:"#94A3B8" }}>
      <div style={{ width:32, height:32, border:"3px solid #E1EAF5", borderTop:"3px solid #3B82F6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:13 }}>Carregando dados...</span>
    </div>
  );
}

function StatCard({accent,iconBg,icon,label,valor,sub,onClick}:{accent:string;iconBg:string;icon:React.ReactNode;label:string;valor:number;sub:string;onClick:()=>void}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...s.statCard,
        boxShadow: hov ? "0 4px 16px rgba(0,0,0,0.10)" : "0 1px 3px rgba(0,0,0,0.05)",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        transition: "box-shadow 0.15s, transform 0.15s",
      }}
    >
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:accent,borderRadius:"12px 12px 0 0"}}/>
      <div style={{...s.statIconWrap,background:iconBg}}>{icon}</div>
      <div style={s.statVal}>{valor}</div>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statSub}>{sub}</div>
    </button>
  );
}

const IcoUserPlus = ({color="#1E3A8A"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>;
const IcoCheck  = ({color="#1E3A8A"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoTruck  = ({color="#1563D5"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>;
const IcoWrench = ({color="#B45309"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IcoAlert  = ({color="#DC2626"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoList   = ({color="#1E3A8A"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IcoUsers  = ({color="#166534"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoChart  = ({color="#3B82F6"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcoDoor   = ({color="#1E3A8A"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="1"/><circle cx="15" cy="12" r="1" fill={color}/></svg>;
const IcoLaptop = ({color="#1E3A8A"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="1"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
const IcoCash   = ({color="#1E3A8A"}) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 6v12M18 6v12"/></svg>;

const s: Record<string,React.CSSProperties> = {
  page:       {display:"flex",minHeight:"100vh",background:"#F1F5F9",fontFamily:"'Sora',system-ui,sans-serif"},
  main:       {flex:1,display:"flex",flexDirection:"column",minWidth:0,overflowY:"auto"},
  topbar:     {background:"#ffffff",borderBottom:"1.5px solid #E1EAF5",padding:"16px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0},
  greeting:   {margin:0,fontSize:18,fontWeight:700,color:"#0F172A"},
  date:       {margin:"3px 0 0",fontSize:12,color:"#7A95B2"},
  alertBtn:   {display:"flex",alignItems:"center",gap:7,background:"#FFFBEB",border:"1.5px solid #FDE68A",color:"#92400E",padding:"8px 16px",borderRadius:99,cursor:"pointer",fontSize:12,fontWeight:700,transition:"background 0.15s"},
  content:    {padding:"24px 28px",flex:1},

  /* Alerta de atraso */
  alertBox:   {marginBottom:20,background:"#fff5f5",border:"1px solid #fecaca",borderRadius:12,overflow:"hidden"},
  alertHeader:{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderBottom:"1px solid #fecaca",background:"#fff1f1"},
  alertRow:   {display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:"1px solid #fee2e2"},

  /* KPI grid — 3 colunas fixas */
  kpiGrid:    {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24},
  statCard:   {background:"#ffffff",border:"1px solid #E1EAF5",borderRadius:12,padding:"16px 18px",cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",gap:6,position:"relative",overflow:"hidden"},
  statIconWrap:{width:38,height:38,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2},
  statVal:    {fontSize:24,fontWeight:800,color:"#0F172A",lineHeight:"1"},
  statLabel:  {fontSize:13,fontWeight:700,color:"#334155"},
  statSub:    {fontSize:11,color:"#7A95B2"},

  /* Bento */
  bento:      {display:"grid",gridTemplateColumns:"1fr 300px",gap:16,alignItems:"start"},
  bentoLeft:  {},
  bentoRight: {},
  card:       {background:"#ffffff",border:"1px solid #E1EAF5",borderRadius:12,padding:"1.25rem",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"},

  /* Ações rápidas */
  acaoCard:   {background:"#ffffff",border:"1px solid #E1EAF5",borderRadius:12,padding:"13px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,width:"100%",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",transition:"box-shadow 0.15s, transform 0.15s"},
  acaoIcon:   {width:38,height:38,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  acaoLabel:  {fontSize:13,fontWeight:700,color:"#0F172A"},
  acaoDesc:   {fontSize:11,color:"#7A95B2",marginTop:2},
  acaoArrow:  {marginLeft:"auto",fontSize:18,color:"#CBD5E1"},
  /* Contador de pendências sobre o ícone da ação — mesmo padrão do badge da Sidebar */
  acaoBadge:  {position:"absolute" as const,top:-5,right:-5,minWidth:17,height:17,padding:"0 4px",borderRadius:99,background:"#E53E3E",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,border:"2px solid #ffffff",boxSizing:"border-box" as const},
};
