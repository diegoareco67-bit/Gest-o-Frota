import { useEffect, useState } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Sidebar } from "../../components/layout/Sidebar";

interface SolicitacaoRel { id?:string; protocolo?:string; condutorNome?:string; condutorSetor?:string; veiculoPlaca?:string; destino?:string; motivo?:string; dataSaida?:string; dataRetorno?:string; status?:string; }
interface ManutencaoRel  { veiculoPlaca?:string; tipo?:string; descricao?:string; custo?:number; status?:string; criadoEm?:{toDate:()=>Date}; }
interface UsoRel         { solicitacaoId?:string; kmSaida?:number; kmChegada?:number; kmRodado?:number; combustivelSaida?:string; combustivelChegada?:string; tipoOcorrencia?:string; observacoes?:string; observacoesChegada?:string; status?:string; saidaEm?:{toDate:()=>Date}; chegadaEm?:{toDate:()=>Date}; }

function exportarCsv(nomeArquivo: string, cabecalho: string[], linhas: string[][]) {
  const bom = "﻿";
  const conteudo = [cabecalho, ...linhas].map(l => l.map(c => `"${String(c ?? "").replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob = new Blob([bom + conteudo], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=nomeArquivo; a.click();
  URL.revokeObjectURL(url);
}

interface Resumo { totalVeiculos:number; disponiveis:number; emUso:number; manutencao:number; totalSolicitacoes:number; aprovadas:number; recusadas:number; pendentes:number; totalUsuarios:number; totalManutencoes:number; custoManutencao:number; disponibilidade:number; }

const REPORT_CARDS = [
  {id:"frota",    title:"Utilização da Frota",    sub:"Análise de uso dos veículos",     cor:"#1E3A8A", bgIco:"#dbeafe",
    ico:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round"><path d="M2 16V11h7l2-3h3v3h8v5M2 16h20"/><circle cx="6.5" cy="18.5" r="2.3"/><circle cx="17.5" cy="18.5" r="2.3"/></svg>},
  {id:"manut",    title:"Manutenções",             sub:"Histórico de manutenções",        cor:"#D97706", bgIco:"#fef9c3",
    ico:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>},
  {id:"solic",    title:"Solicitações",            sub:"Solicitações por período",        cor:"#0891B2", bgIco:"#cffafe",
    ico:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},
  {id:"condut",   title:"Usuários",                sub:"Atividade dos usuários",           cor:"#059669", bgIco:"#d1fae5",
    ico:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>},
  {id:"disp",     title:"Disponibilidade",         sub:"Índice de disponibilidade",       cor:"#DC2626", bgIco:"#fee2e2",
    ico:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
];

export default function Relatorios() {
  const [resumo,setResumo] = useState<Resumo|null>(null);
  const [load,setLoad]     = useState(true);
  const [periodo,setPeriodo] = useState(new Date().toISOString().slice(0,7));
  const [solicitacoesRel,setSolicitacoesRel] = useState<SolicitacaoRel[]>([]);
  const [manutencoesRel,setManutencoesRel]   = useState<ManutencaoRel[]>([]);
  const [usosRel,setUsosRel]                 = useState<UsoRel[]>([]);

  useEffect(()=>{carregar();},[]);

  async function carregar(){
    setLoad(true);
    // Exceção deliberada ao limit(200) padrão: relatório existe pra somar o histórico
    // inteiro, então o teto aqui é só um backstop (2000), não um recorte funcional.
    const [vs,ss,cs,ms,us]=await Promise.all([
      getDocs(query(collection(db,"veiculos"),limit(2000))),
      getDocs(query(collection(db,"solicitacoes"),limit(2000))),
      getDocs(query(collection(db,"usuarios"),limit(2000))),
      getDocs(query(collection(db,"manutencoes"),limit(2000))),
      getDocs(query(collection(db,"usos"),limit(2000))),
    ]);
    const v=vs.docs.map(d=>d.data()), s=ss.docs.map(d=>d.data()), m=ms.docs.map(d=>d.data());
    setSolicitacoesRel(ss.docs.map(d=>({id:d.id,...d.data()} as SolicitacaoRel)));
    setManutencoesRel(ms.docs.map(d=>d.data() as ManutencaoRel));
    setUsosRel(us.docs.map(d=>d.data() as UsoRel));
    const disp=v.filter(x=>x.status==="disponivel").length;
    setResumo({
      totalVeiculos:v.length, disponiveis:disp, emUso:v.filter(x=>x.status==="em_uso").length,
      manutencao:v.filter(x=>x.status==="manutencao").length, totalSolicitacoes:s.length,
      aprovadas:s.filter(x=>x.status==="aprovada"||x.status==="concluida").length,
      recusadas:s.filter(x=>x.status==="recusada").length, pendentes:s.filter(x=>x.status==="pendente").length,
      totalUsuarios:cs.docs.filter(d=>d.data().perfil==="usuario").length,
      totalManutencoes:m.length, custoManutencao:m.reduce((a,x)=>a+(Number(x.custo)||0),0),
      disponibilidade:v.length>0?Math.round((disp/v.length)*100):0,
    });
    setLoad(false);
  }

  const mesLabel = ()=>{try{return new Date(periodo+"-01").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});}catch{return periodo;}};

  function exportarSolicitacoes() {
    // Filtrar pelo mês/período selecionado se não for "Todos"
    const filtradas = solicitacoesRel.filter(s => {
      if (!s.dataSaida) return false;
      const mesDoc = s.dataSaida.slice(0,7);
      return mesDoc === periodo;
    });
    const linhas = (filtradas.length > 0 ? filtradas : solicitacoesRel).map(s=>[
      s.protocolo||"", s.condutorNome||"", s.condutorSetor||"",
      s.veiculoPlaca||"", s.destino||"", s.motivo||"",
      s.dataSaida ? new Date(s.dataSaida).toLocaleString("pt-BR") : "",
      s.dataRetorno ? new Date(s.dataRetorno).toLocaleString("pt-BR") : "",
      s.status||"",
    ]);
    exportarCsv(`solicitacoes_${periodo}.csv`,["Protocolo","Condutor","Setor","Veículo","Destino","Motivo","Saída","Retorno","Status"],linhas);
  }

  function exportarViagens() {
    const solMap = new Map(solicitacoesRel.map(s => [s.id, s]));
    const concluidos = usosRel.filter(u => u.status === "concluido");
    const linhas = concluidos.map(u => {
      const sol = solMap.get(u.solicitacaoId ?? "");
      return [
        sol?.protocolo ?? "",
        sol?.condutorNome ?? "",
        sol?.condutorSetor ?? "",
        sol?.veiculoPlaca ?? "",
        sol?.destino ?? "",
        sol?.motivo ?? "",
        u.kmSaida   != null ? String(u.kmSaida)   : "",
        u.kmChegada != null ? String(u.kmChegada) : "",
        u.kmRodado  != null ? String(u.kmRodado)  : "",
        u.combustivelSaida    ?? "",
        u.combustivelChegada  ?? "",
        u.tipoOcorrencia      ?? "normal",
        u.observacoes         ?? "",
        u.observacoesChegada  ?? "",
        u.saidaEm?.toDate  ? u.saidaEm.toDate().toLocaleString("pt-BR")  : "",
        u.chegadaEm?.toDate? u.chegadaEm.toDate().toLocaleString("pt-BR"): "",
      ];
    });
    exportarCsv(`viagens_concluidas_${periodo}.csv`, [
      "Protocolo","Condutor","Setor","Veículo","Destino","Motivo",
      "KM Saída","KM Chegada","KM Rodado",
      "Combustível Saída","Combustível Chegada",
      "Ocorrência","Obs. Saída","Obs. Chegada",
      "Data Saída","Data Chegada",
    ], linhas);
  }

  function exportarManutencoes() {
    const linhas = manutencoesRel.map(m=>[
      m.veiculoPlaca||"", m.tipo||"", m.descricao||"",
      m.custo!=null ? m.custo.toFixed(2) : "",
      m.status||"",
      m.criadoEm?.toDate ? m.criadoEm.toDate().toLocaleDateString("pt-BR") : "",
    ]);
    exportarCsv(`manutencoes_${periodo}.csv`,["Veículo","Tipo","Descrição","Custo (R$)","Status","Data"],linhas);
  }

  return(
    <div style={{display:"flex",minHeight:"100vh",background:"#F1F5F9",fontFamily:"'Sora',system-ui,sans-serif"}}>
      <Sidebar perfil="gestor"/>

      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* Topbar */}
        <div style={{background:"#ffffff",borderBottom:"1.5px solid #E1EAF5",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:"#0F172A"}}>Relatórios</div>
            <div style={{fontSize:12,color:"#7A95B2",marginTop:2}}>Gere relatórios e análises da frota</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={carregar} style={{background:"#F1F5F9",color:"#5A7A9A",border:"1px solid #E1EAF5",borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-5.5"/></svg>
              Atualizar
            </button>
            <button onClick={exportarViagens} style={{background:"#059669",color:"#fff",border:"none",borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV Viagens
            </button>
            <button onClick={exportarSolicitacoes} style={{background:"#1E3A8A",color:"#fff",border:"none",borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV Agendamentos
            </button>
            <button onClick={exportarManutencoes} style={{background:"#7C3AED",color:"#fff",border:"none",borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV Manutenções
            </button>
          </div>
        </div>

        <div style={{padding:"20px 24px",flex:1,overflowY:"auto"}}>
          {/* Filtro de período (usado nas exportações CSV) */}
          <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
            <label htmlFor="rel-periodo" style={{fontSize:12,fontWeight:600,color:"#5A7A9A"}}>Período das exportações</label>
            <input id="rel-periodo" type="month" value={periodo} onChange={e=>setPeriodo(e.target.value)}
              style={{padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,background:"#ffffff",color:"#0F172A",fontFamily:"inherit"} as React.CSSProperties}/>
          </div>

          {load?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"5rem",gap:14,color:"#94A3B8"}}>
              <div style={{width:32,height:32,border:"3px solid #E1EAF5",borderTop:"3px solid #3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <span style={{fontSize:13}}>Carregando dados...</span>
            </div>
          ):(
            <>
              {/* Categorias cobertas pelo resumo abaixo (informativo, não interativo) */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginBottom:24}}>
                {REPORT_CARDS.map(c=>(
                  <div key={c.id}
                    style={{background:"#ffffff",border:"1px solid #E1EAF5",borderRadius:12,padding:"16px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:c.bgIco,display:"flex",alignItems:"center",justifyContent:"center"}}>{c.ico}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#0F172A"}}>{c.title}</div>
                        <div style={{fontSize:11,color:"#7A95B2"}}>{c.sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Painel de dados */}
              {resumo&&(
                <div style={{background:"#ffffff",borderRadius:12,border:"1px solid #E1EAF5",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                  <div style={{padding:"16px 20px",borderBottom:"1px solid #E1EAF5",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#F8FAFC"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>Resumo · {mesLabel()}</div>
                    <span style={{fontSize:11,color:"#7A95B2"}}>Relatórios exportados em PDF ou Excel</span>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:0}}>
                    {[
                      {label:"Total de Veículos",    val:resumo.totalVeiculos,    sub:"na frota",               cor:"#1E3A8A"},
                      {label:"Disponíveis",          val:resumo.disponiveis,      sub:"prontos para uso",       cor:"#22C55E"},
                      {label:"Em Uso",               val:resumo.emUso,            sub:"circulando agora",       cor:"#3B82F6"},
                      {label:"Em Manutenção",        val:resumo.manutencao,       sub:"em reparo",              cor:"#D97706"},
                      {label:"Total Solicitações",   val:resumo.totalSolicitacoes,sub:"no período",             cor:"#0891B2"},
                      {label:"Aprovadas",            val:resumo.aprovadas,        sub:"executadas",             cor:"#059669"},
                      {label:"Pendentes",            val:resumo.pendentes,        sub:"aguardando",             cor:"#DC2626"},
                      {label:"Usuários",              val:resumo.totalUsuarios,    sub:"ativos",                 cor:"#7C3AED"},
                      {label:"Manutenções",          val:resumo.totalManutencoes, sub:"registradas",            cor:"#D97706"},
                      {label:"Custo Manutenções",    val:`R$ ${resumo.custoManutencao.toFixed(2)}`,sub:"total gasto",cor:"#DC2626"},
                      {label:"Disponibilidade",      val:`${resumo.disponibilidade}%`,sub:"da frota livre",    cor:"#059669"},
                    ].map((item,i)=>(
                      <div key={i} style={{padding:"16px 20px",borderRight:i%4!==3?"1px solid #F1F5F9":"none",borderBottom:"1px solid #F1F5F9"}}>
                        <div style={{fontSize:11,color:"#7A95B2",marginBottom:4,fontWeight:500}}>{item.label}</div>
                        <div style={{fontSize:24,fontWeight:800,color:item.cor,lineHeight:1}}>{item.val}</div>
                        <div style={{fontSize:11,color:"#94A3B8",marginTop:3}}>{item.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de utilização */}
                  <div style={{padding:"16px 20px",borderTop:"1px solid #F1F5F9"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:8}}>Utilização da frota</div>
                    <div style={{display:"flex",gap:4,height:12,borderRadius:99,overflow:"hidden",background:"#F1F5F9"}}>
                      <div style={{background:"#22C55E",width:`${resumo.totalVeiculos>0?(resumo.disponiveis/resumo.totalVeiculos)*100:0}%`,transition:"width 0.5s"}}/>
                      <div style={{background:"#3B82F6",width:`${resumo.totalVeiculos>0?(resumo.emUso/resumo.totalVeiculos)*100:0}%`,transition:"width 0.5s"}}/>
                      <div style={{background:"#FACC15",width:`${resumo.totalVeiculos>0?(resumo.manutencao/resumo.totalVeiculos)*100:0}%`,transition:"width 0.5s"}}/>
                    </div>
                    <div style={{display:"flex",gap:16,marginTop:8}}>
                      {[{cor:"#22C55E",l:"Disponível"},{cor:"#3B82F6",l:"Em uso"},{cor:"#FACC15",l:"Manutenção"}].map(x=>(
                        <div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:x.cor}}/>
                          <span style={{fontSize:11,color:"#5A7A9A"}}>{x.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
