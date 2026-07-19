import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";
import { Sidebar } from "../../components/layout/Sidebar";

interface Veiculo { id:string; placa:string; modelo:string; marca:string; ano:number; tipo:string; cor:string; status:string; kmAtual:number; categoriaUso?:string; atualizadoEm?:{toDate:()=>Date}; }

const ST_BADGE: Record<string,{bg:string;color:string;label:string}> = {
  disponivel:  {bg:"#dcfce7",color:"#166534",label:"Disponível"},
  em_uso:      {bg:"#dbeafe",color:"#1e40af",label:"Em Uso"},
  manutencao:  {bg:"#fef9c3",color:"#854d0e",label:"Manutenção"},
  indisponivel:{bg:"#f1f5f9",color:"#475569",label:"Indisponível"},
};

const TIPOS = ["carro","caminhonete","moto","van","caminhão","ônibus"];
const CATEGORIAS = ["Administrativo","Representação","Operacional","Misto"];

export default function Veiculos() {
  const { usuario } = useAuth();
  const [lista,setLista]       = useState<Veiculo[]>([]);
  const [carregando,setLoad]   = useState(true);
  const [modal,setModal]       = useState(false);
  const [editando,setEditando] = useState<Veiculo|null>(null);
  const [busca,setBusca]       = useState("");
  const [filtroSt,setFiltroSt] = useState("todos");
  const [erroModal,setErroModal] = useState("");
  const [form,setForm]         = useState({placa:"",modelo:"",marca:"",ano:new Date().getFullYear(),tipo:"carro",cor:"",status:"disponivel",kmAtual:0,categoriaUso:"Administrativo"});

  useEffect(()=>{carregar();},[]);

  async function carregar(){
    setLoad(true);
    const s = await getDocs(query(collection(db,"veiculos"),limit(200)));
    setLista(s.docs.map(d=>({id:d.id,...d.data()} as Veiculo)));
    setLoad(false);
  }

  function abrirNovo(){setEditando(null);setErroModal("");setForm({placa:"",modelo:"",marca:"",ano:new Date().getFullYear(),tipo:"carro",cor:"",status:"disponivel",kmAtual:0,categoriaUso:"Administrativo"});setModal(true);}
  function abrirEdit(v:Veiculo){setEditando(v);setErroModal("");setForm({placa:v.placa,modelo:v.modelo,marca:v.marca,ano:v.ano,tipo:v.tipo,cor:v.cor||"",status:v.status,kmAtual:v.kmAtual,categoriaUso:v.categoriaUso||"Administrativo"});setModal(true);}

  async function salvar(){
    setErroModal("");
    if(!form.placa||!form.modelo||!form.marca){setErroModal("Preencha placa, modelo e marca.");return;}
    if(editando){
      await updateDoc(doc(db,"veiculos",editando.id),{...form,atualizadoEm:serverTimestamp()});
      await registrarAuditoria("editar_veiculo",usuario?.uid||"",usuario?.nome||"",{veiculoId:editando.id,placa:form.placa});
    } else {
      const ref=await addDoc(collection(db,"veiculos"),{...form,criadoEm:serverTimestamp()});
      await registrarAuditoria("cadastrar_veiculo",usuario?.uid||"",usuario?.nome||"",{veiculoId:ref.id,placa:form.placa});
    }
    setModal(false);carregar();
  }

  const filtrados = lista.filter(v=>{
    const ok = filtroSt==="todos"||v.status===filtroSt;
    const b  = busca===""||v.placa.toLowerCase().includes(busca.toLowerCase())||v.modelo.toLowerCase().includes(busca.toLowerCase())||v.marca.toLowerCase().includes(busca.toLowerCase());
    return ok&&b;
  });

  function fmtData(v:Veiculo){ try{return v.atualizadoEm?.toDate().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});}catch{return "—";} }
  function cap(s:string){return s.charAt(0).toUpperCase()+s.slice(1);}

  return(
    <div style={{display:"flex",minHeight:"100vh",background:"#F1F5F9",fontFamily:"'Sora',system-ui,sans-serif"}}>
      <Sidebar perfil="gestor"/>

      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* Topbar */}
        <div style={{background:"#ffffff",borderBottom:"1.5px solid #E1EAF5",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:"#0F172A"}}>Veículos</div>
            <div style={{fontSize:12,color:"#7A95B2",marginTop:2}}>Gerencie os veículos da frota oficial</div>
          </div>
          <button onClick={abrirNovo} style={{background:"#1E3A8A",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Veículo
          </button>
        </div>

        <div style={{padding:"20px 24px",flex:1,overflowY:"auto"}}>
          {/* Filtros */}
          <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A95B2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar veículo..."
                style={{width:"100%",padding:"9px 12px 9px 32px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,boxSizing:"border-box",background:"#ffffff",fontFamily:"inherit",color:"#0F172A"} as React.CSSProperties}/>
            </div>
            <select value={filtroSt} onChange={e=>setFiltroSt(e.target.value)}
              style={{padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,background:"#ffffff",color:"#0F172A",fontFamily:"inherit",cursor:"pointer"} as React.CSSProperties}>
              <option value="todos">Todos os status</option>
              <option value="disponivel">Disponível</option>
              <option value="em_uso">Em Uso</option>
              <option value="manutencao">Manutenção</option>
              <option value="indisponivel">Indisponível</option>
            </select>
          </div>

          {/* Tabela */}
          <div style={{background:"#ffffff",borderRadius:12,border:"1px solid #E1EAF5",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#F8FAFC",borderBottom:"1px solid #E1EAF5"}}>
                  {["Placa","Modelo","Tipo","Uso","Status","Última Atualização","Ações"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"11px 16px",fontSize:11,fontWeight:700,color:"#5A7A9A",textTransform:"uppercase",letterSpacing:"0.5px"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carregando?(
                  <tr><td colSpan={7} style={{textAlign:"center",padding:"3rem"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,color:"#94A3B8"}}>
                      <div style={{width:22,height:22,border:"2px solid #E1EAF5",borderTop:"2px solid #3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                      <span style={{fontSize:13}}>Carregando veículos...</span>
                    </div>
                  </td></tr>
                ):filtrados.length===0?(
                  <tr><td colSpan={7} style={{textAlign:"center",padding:"3rem"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                      <div style={{width:48,height:48,borderRadius:"50%",background:"#F1F5F9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🚗</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#334155"}}>Nenhum veículo encontrado</div>
                      <div style={{fontSize:12,color:"#7A95B2"}}>Tente ajustar os filtros ou cadastre um novo veículo</div>
                    </div>
                  </td></tr>
                ):filtrados.map((v)=>{
                  const st=ST_BADGE[v.status]||{bg:"#f1f5f9",color:"#475569",label:v.status};
                  return(
                    <tr key={v.id} style={{borderBottom:"1px solid #F1F5F9",transition:"background 0.1s"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F8FAFC"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <td style={{padding:"12px 16px",fontSize:13,fontWeight:700,color:"#0F172A"}}>{v.placa}</td>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#334155"}}>{v.marca} {v.modelo}</td>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#5A7A9A"}}>{cap(v.tipo)}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#7A95B2"}}>{v.categoriaUso||"—"}</td>
                      <td style={{padding:"12px 16px"}}>
                        <span style={{background:st.bg,color:st.color,padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700}}>{st.label}</span>
                      </td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#7A95B2"}}>{fmtData(v)}</td>
                      <td style={{padding:"12px 16px"}}>
                        <button onClick={()=>abrirEdit(v)} style={{background:"#eff6ff",color:"#1e40af",border:"1px solid #bfdbfe",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Editar</button>
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
        <div role="dialog" aria-modal="true" aria-labelledby="modal-veiculo-titulo" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(2px)"}}>
          <div style={{background:"#fff",borderRadius:16,padding:"2rem",width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
              <h2 id="modal-veiculo-titulo" style={{margin:0,fontSize:17,fontWeight:700,color:"#0F172A"}}>{editando?"Editar Veículo":"Novo Veículo"}</h2>
              <button onClick={()=>setModal(false)} aria-label="Fechar modal" style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#7A95B2"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"1rem"}}>
              {([["Placa *","placa","HTO-3017"],["Modelo *","modelo","Corolla"],["Marca *","marca","Toyota"],["Ano","ano","2024"],["Cor","cor","Branco"],["KM Atual","kmAtual","0"]] as [string,string,string][]).map(([l,k,ph])=>(
                <div key={k}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>{l}</label>
                  <input type={k==="ano"||k==="kmAtual"?"number":"text"} placeholder={ph}
                    value={(form as Record<string,string|number>)[k] as string}
                    onChange={e=>setForm(p=>({...p,[k]:k==="ano"||k==="kmAtual"?Number(e.target.value):e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,boxSizing:"border-box",fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}/>
                </div>
              ))}
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}>
                  {TIPOS.map(t=><option key={t} value={t}>{cap(t)}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Categoria de Uso</label>
                <select value={form.categoriaUso} onChange={e=>setForm(p=>({...p,categoriaUso:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}>
                  {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5A7A9A",marginBottom:4}}>Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:"1px solid #E1EAF5",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"#fff",color:"#0F172A"} as React.CSSProperties}>
                  {Object.entries(ST_BADGE).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
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
