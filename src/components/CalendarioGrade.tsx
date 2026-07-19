import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase/config";

interface EventoGrade { id:string; [campo:string]: unknown; status:string; }
interface StatusInfo { cor:string; label:string; }

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS  = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

const STATUS_VEICULOS: Record<string,StatusInfo> = {
  aprovada:   {cor:"#22C55E",label:"Disponível"},
  em_uso:     {cor:"#3B82F6",label:"Em uso"},
  pendente:   {cor:"#FACC15",label:"Manutenção"},
  manutencao: {cor:"#FACC15",label:"Manutenção"},
  concluida:  {cor:"#94A3B8",label:"Livre"},
};
const STATUS_FILTRO_VEICULOS = ["aprovada","em_uso","concluida"];

interface CalendarioGradeProps {
  /** Coleção Firestore de origem — precisa ser legível pelo perfil que acessa a tela. */
  colecao?: string;
  titulo?: string;
  subtitulo?: string;
  /** "escuro" para telas públicas sobre fundo azul-marinho; "claro" para dentro do shell autenticado (Sidebar). */
  tema?: "escuro" | "claro";
  /** Campo do documento usado como rótulo do evento no dia (ex.: "veiculoPlaca", "salaNome"). */
  campoTitulo?: string;
  /** Campos de início/fim do período do evento (aceitam string de data ou data+hora ISO). */
  campoDataInicio?: string;
  campoDataFim?: string;
  /** Legenda e cor por valor de status. */
  statusMap?: Record<string,StatusInfo>;
  /** Quais valores de status entram na query/exibição. */
  statusFiltro?: string[];
}

export function CalendarioGrade({
  colecao = "calendarioPublico",
  titulo = "CALENDÁRIO DE DISPONIBILIDADE",
  subtitulo = "Consulte a disponibilidade pública da frota oficial",
  tema = "claro",
  campoTitulo = "veiculoPlaca",
  campoDataInicio = "dataSaida",
  campoDataFim = "dataRetorno",
  statusMap = STATUS_VEICULOS,
  statusFiltro = STATUS_FILTRO_VEICULOS,
}: CalendarioGradeProps) {
  const hoje = new Date();
  const [mes, setMes]     = useState(hoje.getMonth());
  const [ano, setAno]     = useState(hoje.getFullYear());
  const [evts, setEvts]   = useState<EventoGrade[]>([]);
  const [tip, setTip]     = useState<{evs:EventoGrade[];x:number;y:number}|null>(null);

  useEffect(()=>{
    // Recarregamento periódico em vez de onSnapshot fixo (decisão do CLAUDE.md —
    // esse componente aparece na tela de login, pública e sem controle de audiência,
    // ex. TV de recepção; um listener permanente ali é o principal risco de estourar
    // a cota gratuita, não o volume de uso).
    // limit(500) é um backstop, não um recorte por mês — a query não é escopada por
    // data (a navegação de mês filtra só no cliente). Com volume real (poucas dezenas
    // de eventos/ano) isso não é um problema hoje; se crescer muito, escopar a query
    // por intervalo de data em vez de status é a correção certa.
    const q = query(collection(db,colecao),where("status","in",statusFiltro),limit(500));
    let cancelado = false;
    async function carregar() {
      const snap = await getDocs(q);
      if (!cancelado) setEvts(snap.docs.map(d=>({id:d.id,...d.data()} as EventoGrade)));
    }
    carregar();
    const intervalo = setInterval(carregar, 60000);
    return () => { cancelado = true; clearInterval(intervalo); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[colecao]);

  function nav(d:number){const n=mes+d;if(n<0){setMes(11);setAno(a=>a-1);}else if(n>11){setMes(0);setAno(a=>a+1);}else setMes(n);}

  const p1=new Date(ano,mes,1).getDay(), tot=new Date(ano,mes+1,0).getDate();
  const dias=Array.from({length:p1+tot},(_,i)=>i<p1?null:i-p1+1);

  function campoStr(ev:EventoGrade, campo:string):string { return String(ev[campo] ?? ""); }

  function eDia(dia:number){
    const d=`${ano}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    return evts.filter(e=>campoStr(e,campoDataInicio).slice(0,10)<=d&&d<=campoStr(e,campoDataFim).slice(0,10));
  }

  const escuro = tema === "escuro";
  const corTitulo    = escuro ? "#fff" : "#0F172A";
  const corSubtitulo  = escuro ? "rgba(255,255,255,0.45)" : "#7A95B2";
  const bgCard        = escuro ? "rgba(255,255,255,0.06)" : "#ffffff";
  const borderCard    = escuro ? "1px solid rgba(255,255,255,0.1)" : "1px solid #E1EAF5";
  const corMesAno     = escuro ? "#F8FAFC" : "#1e293b";
  const corBtnNav     = escuro ? "rgba(255,255,255,0.8)" : "#374151";
  const bgBtnNav      = escuro ? "rgba(255,255,255,0.08)" : "#ffffff";
  const borderBtnNav  = escuro ? "1px solid rgba(255,255,255,0.12)" : "1px solid #E1EAF5";
  const corDiaLabel   = escuro ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const bgDia         = escuro ? "rgba(255,255,255,0.03)" : "#fafafa";
  const borderDia     = escuro ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9";
  const corDiaNum     = escuro ? "rgba(255,255,255,0.7)" : "#374151";
  const corLegenda    = escuro ? "rgba(255,255,255,0.55)" : "#64748b";
  const borderLegenda = escuro ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f1f5f9";
  const bgBadge       = escuro ? "rgba(255,255,255,0.07)" : "#F8FAFC";
  const borderBadge   = escuro ? "1px solid rgba(255,255,255,0.1)" : "1px solid #E1EAF5";
  const corBadgeTitulo= escuro ? "#fff" : "#0F172A";
  const corBadgeSub   = escuro ? "#94A3B8" : "#7A95B2";

  const legendaItens = Object.values(statusMap).filter((v,i,arr)=>arr.findIndex(x=>x.label===v.label)===i);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20,height:"100%"}}>
      {(titulo || subtitulo) && (
        <div style={{textAlign: escuro ? "center" : "left"}}>
          {titulo && <div style={{fontSize:22,fontWeight:900,color:corTitulo,letterSpacing:1}}>{titulo}</div>}
          {subtitulo && <div style={{fontSize:12,color:corSubtitulo,marginTop:4}}>{subtitulo}</div>}
        </div>
      )}

      <div style={{background:bgCard,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:borderCard,borderRadius:16,padding:"18px",flex:1,display:"flex",flexDirection:"column",boxShadow: escuro ? "none" : "0 1px 3px rgba(0,0,0,0.05)"}}>
        {/* Nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={()=>nav(-1)} aria-label="Mês anterior" style={{background:bgBtnNav,border:borderBtnNav,borderRadius:8,width:34,height:34,fontSize:22,cursor:"pointer",color:corBtnNav,display:"flex",alignItems:"center",justifyContent:"center"}}><span aria-hidden="true">‹</span></button>
          <span style={{fontSize:18,fontWeight:800,color:corMesAno}} aria-live="polite" aria-atomic="true">{MESES[mes]} {ano}</span>
          <button onClick={()=>nav(1)} aria-label="Próximo mês" style={{background:bgBtnNav,border:borderBtnNav,borderRadius:8,width:34,height:34,fontSize:22,cursor:"pointer",color:corBtnNav,display:"flex",alignItems:"center",justifyContent:"center"}}><span aria-hidden="true">›</span></button>
        </div>

        {/* Dias semana */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
          {DIAS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:corDiaLabel,padding:"4px 0"}}>{d}</div>)}
        </div>

        {/* Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,flex:1}}>
          {dias.map((dia,i)=>{
            if(!dia) return <div key={i} style={{minHeight:56}}/>;
            const evs=eDia(dia);
            const isH=dia===hoje.getDate()&&mes===hoje.getMonth()&&ano===hoje.getFullYear();
            return(
              <div key={i}
                style={{minHeight:56,borderRadius:6,padding:"4px",border:isH?"2px solid rgba(96,165,250,0.7)":borderDia,background:isH?"rgba(59,130,246,0.15)":bgDia,cursor:evs.length>0?"pointer":"default",transition:"background 0.15s"}}
                onMouseEnter={e=>{if(evs.length>0){const r=(e.currentTarget as HTMLElement).getBoundingClientRect();setTip({evs,x:r.right,y:r.top});}}}
                onMouseLeave={()=>setTip(null)}>
                <span style={{fontSize:11,fontWeight:isH?800:500,color:isH?"#93C5FD":corDiaNum,display:"block",marginBottom:2}}>{dia}</span>
                {evs.slice(0,2).map(ev=>{
                  const s=statusMap[ev.status]||Object.values(statusMap)[0];
                  return <div key={ev.id} style={{fontSize:9,background:s.cor,color:"#fff",borderRadius:3,padding:"1px 4px",fontWeight:700,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{campoStr(ev,campoTitulo)}</div>;
                })}
                {evs.length>2&&<div style={{fontSize:9,color:corDiaLabel}}>+{evs.length-2}</div>}
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:12,paddingTop:10,borderTop:borderLegenda}}>
          {legendaItens.map(x=>(
            <div key={x.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:10,height:10,borderRadius:3,background:x.cor}}/>
              <span style={{fontSize:11,color:corLegenda,fontWeight:500}}>{x.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Realtime badge */}
      <div style={{background:bgBadge,border:borderBadge,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <div>
          <div style={{color:corBadgeTitulo,fontWeight:700,fontSize:13}}>Consulta em tempo real</div>
          <div style={{color:corBadgeSub,fontSize:12}}>As informações são atualizadas automaticamente.</div>
        </div>
      </div>

      {/* Tooltip */}
      {tip&&(
        <div style={{position:"fixed",top:tip.y,left:tip.x+8,background:"#0F172A",border:"1px solid #1E3A8A",borderRadius:8,padding:"10px 14px",zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
          {tip.evs.map(ev=>{const s=statusMap[ev.status]||Object.values(statusMap)[0];return(
            <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:s.cor}}/>
              <span style={{color:"#fff",fontSize:12,fontWeight:700}}>{campoStr(ev,campoTitulo)}</span>
              <span style={{color:"#64748B",fontSize:11}}>{s.label}</span>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}
