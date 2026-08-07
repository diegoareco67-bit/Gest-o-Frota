import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { IcoMenu, IcoX } from "../../components/Icone";

const IcoMap = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  check:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  truck:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>,
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
  shield:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  lock:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  gear:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

type IcoKey = keyof typeof IcoMap;

interface NavItem { icon:IcoKey; label:string; path:string; badge?:number; }
interface Section { label:string; items:NavItem[]; }

function getSections(perfil:"gestor"|"usuario"|"consulta"|"auditor", pendentes=0): Section[] {
  if(perfil==="gestor") return [
    { label:"PRINCIPAL", items:[
      {icon:"dashboard",label:"Dashboard",  path:"/gestor"},
      {icon:"check",    label:"Aprovações", path:"/gestor/aprovacoes", badge:pendentes||undefined},
      {icon:"manual",   label:"Manual de Uso da Aplicação", path:"/gestor/manual"},
      {icon:"lock",     label:"Segurança (2FA)", path:"/gestor/seguranca"},
    ]},
    { label:"GESTÃO", items:[
      {icon:"truck",  label:"Veículos",      path:"/gestor/veiculos"},
      {icon:"door",   label:"Salas",         path:"/salas"},
      {icon:"laptop", label:"Equipamentos",  path:"/equipamentos"},
      {icon:"wrench", label:"Manutenção",    path:"/gestor/manutencao"},
      {icon:"users",  label:"Usuários",      path:"/gestor/usuarios"},
      {icon:"building", label:"Setores",     path:"/gestor/setores"},
      {icon:"cash",   label:"Indenizações",  path:"/gestor/indenizacoes"},
      {icon:"gear",   label:"Configurações", path:"/gestor/configuracoes"},
    ]},
    { label:"ANÁLISE", items:[
      {icon:"chart",  label:"Relatórios", path:"/gestor/relatorios"},
      {icon:"shield", label:"Auditoria",  path:"/gestor/auditoria"},
    ]},
  ];
  if(perfil==="consulta") return [
    { label:"MENU", items:[
      {icon:"home", label:"Calendários", path:"/consulta"},
    ]},
  ];
  if(perfil==="auditor") return [
    { label:"FISCALIZAÇÃO", items:[
      {icon:"shield", label:"Auditoria",  path:"/auditor"},
      {icon:"chart",  label:"Relatórios", path:"/gestor/relatorios"},
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

/**
 * Todos os ícones usam o mesmo azul claro — antes cada item tinha uma cor própria
 * (amarelo, verde, ciano, roxo, coral...), transformando a barra lateral num
 * arco-íris. A cor não carregava informação: era variedade decorativa. Quem
 * comunica seleção agora é o estado ativo do item, não o matiz do ícone.
 */
const ICO_COR_PADRAO = "#7EB8F7";

const ICO_COLORS: Record<IcoKey, string> = {
  dashboard: ICO_COR_PADRAO,
  check: ICO_COR_PADRAO,
  truck: ICO_COR_PADRAO,
  wrench: ICO_COR_PADRAO,
  users: ICO_COR_PADRAO,
  chart: ICO_COR_PADRAO,
  home: ICO_COR_PADRAO,
  plus: ICO_COR_PADRAO,
  list: ICO_COR_PADRAO,
  logout: "#5A8AB8",
  door: ICO_COR_PADRAO,
  cash: ICO_COR_PADRAO,
  laptop: ICO_COR_PADRAO,
  building: ICO_COR_PADRAO,
  manual: ICO_COR_PADRAO,
  shield: ICO_COR_PADRAO,
  lock: ICO_COR_PADRAO,
  gear: ICO_COR_PADRAO,
};

interface SidebarProps { perfil:"gestor"|"usuario"|"consulta"|"auditor"; }

export function Sidebar({perfil}: SidebarProps) {
  const {usuario, logout} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [countPendentes, setCountPendentes] = useState(0);
  const sections = getSections(perfil, countPendentes);
  const [hovered, setHovered] = useState<string|null>(null);
  const [logoutHovered, setLogoutHovered] = useState(false);
  // Tela inicial de cada perfil — destino do clique na marca
  const rotaInicial = perfil === "gestor" ? "/gestor" : perfil === "consulta" ? "/consulta" : perfil === "auditor" ? "/auditor" : "/usuario";
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
          aria-label="Abrir menu"style={{ position:"fixed", top:10, right:10, zIndex:700,
            width:38, height:38, borderRadius:8, border:"none",
            background:"#0B1F3A", color:"#fff", fontSize:18, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}
        >
          <IcoMenu tam={14}/>
        </button>
      )}

      {/* Overlay escuro — fecha o menu ao clicar fora */}
      {isMobile && aberta && (
        <div
          onClick={() => setAberta(false)}
          aria-hidden="true"style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
            zIndex:599, backdropFilter:"blur(2px)" }}
        />
      )}

      <aside style={sbStyle} aria-label="Navegação principal">
      {/* Textura */}
      <div style={s.texture} aria-hidden="true"/>
      <div style={s.shine} aria-hidden="true"/>

      {/* Logo + botão fechar em mobile.
          A marca é clicável e leva à tela inicial do perfil — comportamento que o
          usuário espera de qualquer logo de sistema, e que antes não existia. */}
      <div style={s.brand}>
        <button
          type="button"
          onClick={() => { navigate(rotaInicial); if (isMobile) setAberta(false); }}
          aria-label="Ir para a tela inicial"
          title="Ir para a tela inicial"
          style={s.brandBtn}
        >
          <div style={s.logoBox}>
            {IcoMap.dashboard}
          </div>
          <div style={{flex:1,textAlign:"left"}}>
            <div style={s.logoTitle}>Hub</div>
            <div style={s.logoSub}>CGE · MS</div>
          </div>
        </button>
        {isMobile && (
          <button
            onClick={() => setAberta(false)}
            aria-label="Fechar menu"style={{ background:"none", border:"none", color:"#5A8AB8",
              cursor:"pointer", padding:4, display:"flex", alignItems:"center",
              fontSize:18, flexShrink:0 }}
          >
            <IcoX tam={14}/>
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
                      ? "rgba(255,255,255,0.15)": isHov
                      ? "rgba(255,255,255,0.09)": "rgba(255,255,255,0.06)",
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
            <div style={s.userRole}>{perfil==="gestor"?"Gestor":perfil==="consulta"?"Consulta":perfil==="auditor"?"Auditor":"Usuário"} · CGE-MS</div>
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
            title="Sair do sistema"aria-label="Sair do sistema">
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
  brandBtn:  {display:"flex",alignItems:"center",gap:10,background:"none",border:"none",padding:0,margin:0,flex:1,cursor:"pointer",font:"inherit",color:"inherit"},
  logoBox:   {width:36,height:36,background:"linear-gradient(135deg,#1E6FD4,#1450A3)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0,boxShadow:"0 2px 12px rgba(30,111,212,0.45)"},
  logoTitle: {color:"#fff",fontWeight:800,fontSize:14,letterSpacing:-0.3},
  logoSub:   {color:"#A8CBF0",fontSize:11,fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase" as const},
  nav:       {flex:1,overflowY:"auto" as const,padding:"6px 0"},
  section:   {padding:"10px 8px 4px",position:"relative",zIndex:1},
  secLabel:  {fontSize:9,fontWeight:700,color:"#3D6A9E",textTransform:"uppercase" as const,letterSpacing:"1.2px",padding:"0 8px",marginBottom:4},
  navItem:   {display:"flex",alignItems:"center",gap:9,padding:"8px 8px",borderRadius:8,border:"1px solid transparent",background:"transparent",fontSize:13,cursor:"pointer",textAlign:"left" as const,width:"100%",marginBottom:2,position:"relative" as const,transition:"background 0.15s, border-color 0.15s"},
  navActive: {background:"linear-gradient(135deg,rgba(30,111,212,0.38),rgba(20,80,163,0.22))",border:"1px solid rgba(56,130,246,0.28)",fontWeight:700},
  navHover:  {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.06)"},
  activeBar: {position:"absolute" as const,left:0,top:"50%",transform:"translateY(-50%)",width:3,height:"56%",background:"linear-gradient(180deg,#F59E0B,#D4A80F)",borderRadius:"0 3px 3px 0"},
  ico:       {width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  badge:     {background:"#E53E3E",color:"#fff",borderRadius:99,fontSize:9,fontWeight:700,padding:"1px 5px",lineHeight:1.4},
  bottom:    {padding:"8px 8px 14px",borderTop:"1px solid rgba(255,255,255,0.07)",flexShrink:0,position:"relative" as const,zIndex:1},
  userCard:  {display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"},
  avatar:    {width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1E6FD4,#1A6B3A)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0,letterSpacing:-0.5},
  userName:  {color:"#fff",fontSize:11,fontWeight:700,lineHeight:"1.2"},
  userRole:  {color:"#7EB8F7",fontSize:11,lineHeight:"1.2"},
  logoutBtn: {border:"none",cursor:"pointer",padding:5,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,flexShrink:0,transition:"background 0.15s, color 0.15s"},
};
