import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "../../firebase/config";

const IcoMap = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  check:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  truck:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  wrench:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  users:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  chart:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  home:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  plus:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  list:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  logout:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  door:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="1"/><circle cx="15" cy="12" r="1" fill="currentColor"/></svg>,
  cash:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 6v12M18 6v12"/></svg>,
  laptop:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="1"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  building:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/><line x1="9" y1="18" x2="15" y2="18"/></svg>,
  manual:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
};

type IcoKey = keyof typeof IcoMap;

interface NavItem { icon:IcoKey; label:string; path:string; badge?:number; }
interface Section { label:string; items:NavItem[]; }

function getSections(perfil:"gestor"|"usuario"|"consulta", pendentes=0): Section[] {
  if(perfil==="gestor") return [
    { label:"PRINCIPAL", items:[
      {icon:"dashboard",label:"Dashboard",  path:"/gestor"},
      {icon:"check",    label:"Aprovações", path:"/gestor/aprovacoes", badge:pendentes||undefined},
      {icon:"manual",   label:"Manual de Uso da Aplicação", path:"/gestor/manual"},
    ]},
    { label:"GESTÃO", items:[
      {icon:"truck",  label:"Veículos",      path:"/gestor/veiculos"},
      {icon:"door",   label:"Salas",         path:"/salas"},
      {icon:"laptop", label:"Equipamentos",  path:"/equipamentos"},
      {icon:"wrench", label:"Manutenção",    path:"/gestor/manutencao"},
      {icon:"users",  label:"Usuários",      path:"/gestor/usuarios"},
      {icon:"building", label:"Setores",     path:"/gestor/setores"},
      {icon:"cash",   label:"Indenizações",  path:"/gestor/indenizacoes"},
    ]},
    { label:"ANÁLISE", items:[
      {icon:"chart", label:"Relatórios", path:"/gestor/relatorios"},
    ]},
  ];
  if(perfil==="consulta") return [
    { label:"MENU", items:[
      {icon:"home", label:"Calendários", path:"/consulta"},
    ]},
  ];
  return [
    { label:"MENU", items:[
      {icon:"home", label:"Início",              path:"/usuario"},
      {icon:"plus", label:"Nova Solicitação",    path:"/usuario/solicitar"},
      {icon:"list", label:"Minhas Solicitações", path:"/usuario/solicitacoes"},
      {icon:"door", label:"Salas",               path:"/salas"},
      {icon:"laptop", label:"Equipamentos",      path:"/equipamentos"},
    ]},
    { label:"INDENIZAÇÃO", items:[
      {icon:"truck", label:"Veículo Próprio", path:"/usuario/veiculo-proprio"},
      {icon:"cash",  label:"Indenizações",    path:"/usuario/indenizacoes"},
    ]},
  ];
}

const ICO_COLORS: Record<IcoKey, string> = {
  dashboard: "#7EB8F7",
  check:     "#FACC15",
  truck:     "#7EB8F7",
  wrench:    "#FCA5A5",
  users:     "#6DCF92",
  chart:     "#67E8F9",
  home:      "#7EB8F7",
  plus:      "#6DCF92",
  list:      "#7EB8F7",
  logout:    "#5A8AB8",
  door:      "#C4A6F7",
  cash:      "#6DCF92",
  laptop:    "#67E8F9",
  building:  "#7EB8F7",
  manual:    "#FCD34D",
};

interface SidebarProps { perfil:"gestor"|"usuario"|"consulta"; pendentes?:number; }

export function Sidebar({perfil}: SidebarProps) {
  const {usuario, logout} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [countPendentes, setCountPendentes] = useState(0);
  const sections = getSections(perfil, countPendentes);
  const [hovered, setHovered] = useState<string|null>(null);
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setAberta(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Badge de pendentes em tempo real — apenas para gestores
  useEffect(() => {
    if (perfil !== "gestor") return;
    const q = query(collection(db, "solicitacoes"), where("status", "==", "pendente"), limit(200));
    return onSnapshot(q, snap => setCountPendentes(snap.size));
  }, [perfil]);

  const initials = usuario?.nome
    ? usuario.nome.split(" ").slice(0,2).map((n:string)=>n[0]).join("").toUpperCase()
    : "??";

  function isActive(path:string) {
    if(path==="/gestor"||path==="/usuario"||path==="/consulta") return location.pathname===path;
    return location.pathname.startsWith(path);
  }

  const sbStyle: React.CSSProperties = isMobile
    ? { ...s.sb, position:"fixed", top:0, left:0, zIndex:600,
        transform: aberta ? "translateX(0)" : "translateX(-100%)",
        transition:"transform 0.25s ease" }
    : s.sb;

  return (
    <>
      {/* Botão hambúrguer — visível apenas em mobile quando fechado */}
      {isMobile && !aberta && (
        <button
          onClick={() => setAberta(true)}
          aria-label="Abrir menu"
          style={{ position:"fixed", top:10, right:10, zIndex:700,
            width:38, height:38, borderRadius:8, border:"none",
            background:"#0B1F3A", color:"#fff", fontSize:20, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}
        >
          ☰
        </button>
      )}

      {/* Overlay escuro — fecha o menu ao clicar fora */}
      {isMobile && aberta && (
        <div
          onClick={() => setAberta(false)}
          aria-hidden="true"
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
            zIndex:599, backdropFilter:"blur(2px)" }}
        />
      )}

      <aside style={sbStyle} aria-label="Navegação principal">
      {/* Textura */}
      <div style={s.texture} aria-hidden="true"/>
      <div style={s.shine} aria-hidden="true"/>

      {/* Logo + botão fechar em mobile */}
      <div style={s.brand}>
        <div style={s.logoBox}>
          {IcoMap.dashboard}
        </div>
        <div style={{flex:1}}>
          <div style={s.logoTitle}>Hub</div>
          <div style={s.logoSub}>CGE · MS</div>
        </div>
        {isMobile && (
          <button
            onClick={() => setAberta(false)}
            aria-label="Fechar menu"
            style={{ background:"none", border:"none", color:"#5A8AB8",
              cursor:"pointer", padding:4, display:"flex", alignItems:"center",
              fontSize:18, flexShrink:0 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={s.nav} aria-label="Menu principal">
        {sections.map(sec=>(
          <div key={sec.label} style={s.section} role="group" aria-label={sec.label}>
            <div style={s.secLabel} aria-hidden="true">{sec.label}</div>
            {sec.items.map(item=>{
              const active = isActive(item.path);
              const isHov  = hovered === item.path && !active;
              return (
                <button
                  key={item.path}
                  onClick={()=>{ navigate(item.path); if(isMobile) setAberta(false); }}
                  onMouseEnter={()=>setHovered(item.path)}
                  onMouseLeave={()=>setHovered(null)}
                  aria-current={active ? "page" : undefined}
                  style={{
                    ...s.navItem,
                    ...(active ? s.navActive : isHov ? s.navHover : {}),
                  }}
                >
                  {active && <div style={s.activeBar} aria-hidden="true"/>}
                  <span style={{
                    ...s.ico,
                    background: active
                      ? "rgba(255,255,255,0.15)"
                      : isHov
                      ? "rgba(255,255,255,0.09)"
                      : "rgba(255,255,255,0.06)",
                    color: active ? "#fff" : ICO_COLORS[item.icon],
                    transition: "background 0.15s",
                  }} aria-hidden="true">
                    {IcoMap[item.icon]}
                  </span>
                  <span style={{
                    flex:1,
                    color: active ? "#fff" : isHov ? "#c8ddf7" : "#8CB8DF",
                    fontSize:13,
                    fontWeight: active ? 700 : 500,
                    transition: "color 0.15s",
                  }}>
                    {item.label}
                  </span>
                  {item.badge&&item.badge>0&&(
                    <span style={s.badge} aria-label={`${item.badge} pendente${item.badge>1?"s":""}`}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={s.bottom}>
        <div style={s.userCard}>
          <div style={s.avatar}>{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={s.userName}>{usuario?.nome?.split(" ")[0]??"Usuário"}</div>
            <div style={s.userRole}>{perfil==="gestor"?"Gestor":perfil==="consulta"?"Consulta":"Usuário"} · CGE-MS</div>
          </div>
          <button
            onClick={logout}
            onMouseEnter={()=>setLogoutHovered(true)}
            onMouseLeave={()=>setLogoutHovered(false)}
            style={{
              ...s.logoutBtn,
              background: logoutHovered ? "rgba(255,255,255,0.08)" : "transparent",
              color: logoutHovered ? "#a8cbf0" : "#5A8AB8",
            }}
            title="Sair do sistema"
            aria-label="Sair do sistema"
          >
            <span aria-hidden="true">{IcoMap.logout}</span>
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

const s: Record<string,React.CSSProperties> = {
  sb:        {width:220,background:"#0B1F3A",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0,overflow:"hidden",fontFamily:"'Sora',system-ui,sans-serif"},
  texture:   {position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(135deg,transparent,transparent 3px,rgba(255,255,255,0.012) 3px,rgba(255,255,255,0.012) 6px)",pointerEvents:"none"},
  shine:     {position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)"},
  brand:     {display:"flex",alignItems:"center",gap:10,padding:"18px 14px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",position:"relative",zIndex:1,flexShrink:0},
  logoBox:   {width:36,height:36,background:"linear-gradient(135deg,#1E6FD4,#1450A3)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0,boxShadow:"0 2px 12px rgba(30,111,212,0.45)"},
  logoTitle: {color:"#fff",fontWeight:800,fontSize:14,letterSpacing:-0.3},
  logoSub:   {color:"#A8CBF0",fontSize:9.5,fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase" as const},
  nav:       {flex:1,overflowY:"auto" as const,padding:"6px 0"},
  section:   {padding:"10px 8px 4px",position:"relative",zIndex:1},
  secLabel:  {fontSize:9,fontWeight:700,color:"#3D6A9E",textTransform:"uppercase" as const,letterSpacing:"1.2px",padding:"0 8px",marginBottom:4},
  navItem:   {display:"flex",alignItems:"center",gap:9,padding:"8px 8px",borderRadius:9,border:"1px solid transparent",background:"transparent",fontSize:13,cursor:"pointer",textAlign:"left" as const,width:"100%",marginBottom:2,position:"relative" as const,transition:"background 0.15s, border-color 0.15s"},
  navActive: {background:"linear-gradient(135deg,rgba(30,111,212,0.38),rgba(20,80,163,0.22))",border:"1px solid rgba(56,130,246,0.28)",fontWeight:700},
  navHover:  {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.06)"},
  activeBar: {position:"absolute" as const,left:0,top:"50%",transform:"translateY(-50%)",width:3,height:"56%",background:"linear-gradient(180deg,#FACC15,#D4A80F)",borderRadius:"0 3px 3px 0"},
  ico:       {width:28,height:28,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  badge:     {background:"#E53E3E",color:"#fff",borderRadius:99,fontSize:9,fontWeight:700,padding:"1px 5px",lineHeight:1.4},
  bottom:    {padding:"8px 8px 14px",borderTop:"1px solid rgba(255,255,255,0.07)",flexShrink:0,position:"relative" as const,zIndex:1},
  userCard:  {display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:9,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"},
  avatar:    {width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1E6FD4,#1A6B3A)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:700,flexShrink:0,letterSpacing:-0.5},
  userName:  {color:"#fff",fontSize:11,fontWeight:700,lineHeight:"1.2"},
  userRole:  {color:"#7EB8F7",fontSize:9.5,lineHeight:"1.2"},
  logoutBtn: {border:"none",cursor:"pointer",padding:5,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,flexShrink:0,transition:"background 0.15s, color 0.15s"},
};
