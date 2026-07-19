import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";
import { Sidebar } from "../../components/layout/Sidebar";

interface Manutencao { id:string; veiculoId:string; veiculoPlaca:string; tipo:string; descricao:string; status:string; previsao:string; custo?:number; oficina?:string; criadoEm?:{toDate:()=>Date}; }

const ST: Record<string,{bg:string;color:string;label:string}> = {
  agendada:    {bg:"#dbeafe",color:"#1e40af",label:"Agendada"},
  em_andamento:{bg:"#fef9c3",color:"#854d0e",label:"Em andamento"},
  concluida:   {bg:"#dcfce7",color:"#166534",label:"Concluída"},
  cancelada:   {bg:"#fee2e2",color:"#991b1b",label:"Cancelada"},
};

const TIPOS = ["revisao","troca_pneus","troca_oleo","funilaria","eletrica","instalacao_acessorio","revisao_corretiva","outro"];
const TIPO_LABEL: Record<string,string> = {revisao:"Revisão preventiva",troca_pneus:"Troca de pneus",troca_oleo:"Troca de óleo",funilaria:"Funilaria/Pintura",eletrica:"Elétrica",instalacao_acessorio:"Instalação de acessório",revisao_corretiva:"Revisão corretiva",outro:"Outro"};

export default function Manutencao() {
  const { usuario } = useAuth();
  const [lista,setLista]       = useState<Manutencao[]>([]);
  const [veiculos,setVeiculos] = useState<{id:string;placa:string}[]>([]);
  const [carregando,setLoad]   = useState(true);
  const [modal,setModal]       = useState(false);
  const [erroModal,setErroModal] = useState("");
  const [busca,setBusca]       = useState("");
  const [filtroSt,setFiltroSt] = useState("todas");
  const [form,setForm]         = useState({veiculoId:"",veiculoPlaca:"",tipo:"revisao",descricao:"",status:"agendada",previsao:"",custo:0,oficina:""});

  useEffect(()=>{carregar();},[]);

  async function carregar(){
    setLoad(true);
    const [ms,vs]=await Promise.all([getDocs(query(collection(db,"manutencoes"),limit(500))),getDocs(query(collection(db,"veiculos"),limit(200)))]);
    setLista(ms.docs.map(d=>({id:d.id,...d.data()} as Manutencao)));
    setVeiculos(vs.docs.map(d=>({id:d.id,placa:d.data().placa as string})));
    setLoad(false);
  }

  async function salvar(){
    setErroModal("");
    if(!form.veiculoId||!form.descricao){setErroModal("Preencha veículo e descrição.");return;}
    const ref=await addDoc(collection(db,"manutencoes"),{...form,criadoEm:serverTimestamp()});
    if(form.status==="em_andamento"||form.status==="agendada") await updateDoc(doc(db,"veiculos",form.veiculoId),{status:"manutencao"});
    await registrarAuditoria("registrar_manutencao",usuario?.uid||"",usuario?.nome||"",{manutencaoId:ref.id,veiculoPlaca:form.veiculoPlaca,tipo:form.tipo});
    setModal(false);setForm({veiculoId:"",veiculoPlaca:"",tipo:"revisao",descricao:"",status:"agendada",previsao:"",custo:0,oficina:""});carregar();
  }

  async function concluir(m:Manutencao){
    await updateDoc(doc(db,"manutencoes",m.id),{status:"concluida",concluidoEm:serverTimestamp()});
    await updateDoc(doc(db,"veiculos",m.veiculoId),{status:"disponivel"});
    await registrarAuditoria("concluir_manutencao",usuario?.uid||"",usuario?.nome||"",{manutencaoId:m.id,veiculoPlaca:m.veiculoPlaca});
    carregar();
  }

  const filtradas = lista.filter(m=>{
    const ok=filtroSt==="todas"||m.status===filtroSt;
    const b=busca===""||m.veiculoPlaca?.toLowerCase().includes(busca.toLowerCase())||m.oficina?.toLowerCase().includes(busca.toLowerCase())||m.descricao?.toLowerCase().includes(busca.toLowerCase());
    return ok&&b;
  });

  function fmtData(d:string){if(!d)return"—";try{return new Date(d).toLocaleDateString("pt-BR");}catch{return d;}}

  return(
    <div style={{display:"flex",minHeight:"100vh",background:"#F1F5F9",fontFamily:"'Sora',system-ui,sans-serif"}}>
      <Sidebar perfil="gestor"/>

      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* Topbar */}
        <div style={{background:"#ffffff",borderBottom:"1.5px solid #E1EAF5",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:"#0F172A"}}>Manutenções</div>
            <div style={{fontSize:12,color:"#7A95B2",marginTop:2}}>Acompanhe manutenções e reparos</div>
          </div>
          <button onClick={()=>setModal(true)} style={{background:"#1E3A8A",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Manutenção
          </button>
        </div>

        <div style={{padding:"20px 24px",flex:1,overflowY:"auto"}}>
          {/* Filtros */}
          <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A95B2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar manutenção..."
                style={{width:"100%",padding:"9px 12px 9px 32px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,boxSizing:"border-box",background:"#ffffff",fontFamily:"inherit",color:"#0F172A"} as React.CSSProperties}/>
            </div>
            <select value={filtroSt} onChange={e=>setFiltroSt(e.target.value)} style={{padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,background:"#ffffff",color:"#0F172A",fontFamily:"inherit",cursor:"pointer"} as React.CSSProperties}>
              <option value="todas">Status</option>
              {Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Tabela */}
          <div style={{background:"#ffffff",borderRadius:12,border:"1px solid #E1EAF5",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#F8FAFC",borderBottom:"1px solid #E1EAF5"}}>
                  {["Veículo","Tipo de Manutenção","Status","Data Início","Previsão","Responsável","Ações"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"11px 16px",fontSize:11,fontWeight:700,color:"#5A7A9A",textTransform:"uppercase",letterSpacing:"0.5px"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carregando?(
                  <tr><td colSpan={7} style={{textAlign:"center",padding:"3rem"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,color:"#94A3B8"}}>
                      <div style={{width:22,height:22,border:"2px solid #E1EAF5",borderTop:"2px solid #3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                      <span style={{fontSize:13}}>Carregando manutenções...</span>
                    </div>
                  </td></tr>
                ):filtradas.length===0?(
                  <tr><td colSpan={7} style={{textAlign:"center",padding:"3rem"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                      <div style={{width:48,height:48,borderRadius:"50%",background:"#F1F5F9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔧</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#334155"}}>Nenhuma manutenção encontrada</div>
                      <div style={{fontSize:12,color:"#7A95B2"}}>Cadastre uma nova manutenção para começar</div>
                    </div>
                  </td></tr>
                ):filtradas.map(m=>{
                  const st=ST[m.status]||{bg:"#f1f5f9",color:"#475569",label:m.status};
                  const dataInicio=m.criadoEm?.toDate().toLocaleDateString("pt-BR")||"—";
                  return(
                    <tr key={m.id} style={{borderBottom:"1px solid #F1F5F9",transition:"background 0.1s"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F8FAFC"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <td style={{padding:"12px 16px",fontSize:13,fontWeight:700,color:"#0F172A"}}>{m.veiculoPlaca||"—"}</td>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#334155"}}>{TIPO_LABEL[m.tipo]||m.tipo}</td>
                      <td style={{padding:"12px 16px"}}>
                        <span style={{background:st.bg,color:st.color,padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700}}>{st.label}</span>
                      </td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#7A95B2"}}>{dataInicio}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#7A95B2"}}>{fmtData(m.previsao)}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#7A95B2"}}>{m.oficina||"—"}</td>
                      <td style={{padding:"12px 16px"}}>
                        {m.status!=="concluida"&&m.status!=="cancelada"&&(
                          <button onClick={()=>concluir(m)} style={{background:"#dcfce7",color:"#166534",border:"1px solid #bbf7d0",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Concluir</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modal&&(
        <div role="dialog" aria-modal="true" aria-labelledby="modal-manutencao-titulo" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(2px)"}}>
          <div style={{background:"#fff",borderRadius:16,padding:"2rem",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
              <h2 id="modal-manutencao-titulo" style={{margin:0,fontSize:17,fontWeight:700,color:"#0F172A"}}>Nova Manutenção</h2>
              <button onClick={()=>setModal(false)} aria-label="Fechar modal" style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#7A95B2"}}>✕</button>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {[["Veículo *","select-veiculo"],["Tipo","select-tipo"],["Descrição *","textarea-descricao"]].map(()=>null)}
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Veículo *</label>
                <select value={form.veiculoId} onChange={e=>{const v=veiculos.find(x=>x.id===e.target.value);setForm(p=>({...p,veiculoId:e.target.value,veiculoPlaca:v?.placa||""}));}}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}>
                  <option value="">Selecione um veículo</option>
                  {veiculos.map(v=><option key={v.id} value={v.id}>{v.placa}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}>
                  {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]||t}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Descrição *</label>
                <textarea value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} rows={3}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",background:"#fff",color:"#0F172A"} as React.CSSProperties}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"1rem"}}>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}>
                    {Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Previsão de Conclusão</label>
                  <input type="date" value={form.previsao} onChange={e=>setForm(p=>({...p,previsao:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,boxSizing:"border-box",fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}/>
                </div>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Oficina / Responsável</label>
                  <input value={form.oficina} onChange={e=>setForm(p=>({...p,oficina:e.target.value}))} placeholder="Ex: Oficina Alfa"
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,boxSizing:"border-box",fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}/>
                </div>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Custo Estimado (R$)</label>
                  <input type="number" value={form.custo} onChange={e=>setForm(p=>({...p,custo:Number(e.target.value)}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,boxSizing:"border-box",fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}/>
                </div>
              </div>
            </div>

            {erroModal && (
              <div role="alert" style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#DC2626",marginTop:"1rem",fontWeight:500}}>
                ⚠️ {erroModal}
              </div>
            )}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}>
              <button onClick={()=>setModal(false)} style={{padding:"10px 20px",border:"1px solid #E1EAF5",borderRadius:8,background:"#F8FAFC",fontSize:13,fontWeight:600,cursor:"pointer",color:"#5A7A9A"}}>Cancelar</button>
              <button onClick={salvar} style={{padding:"10px 20px",border:"none",borderRadius:8,background:"#1E3A8A",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
