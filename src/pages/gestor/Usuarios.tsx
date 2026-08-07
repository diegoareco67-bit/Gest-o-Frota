import { Sidebar } from "../../components/layout/Sidebar";
import { useSearchParams } from "react-router-dom";
import { ModalConfirm } from "../../components/ModalConfirm";
import { useEffect, useState } from "react";
import { collection, getDocs, setDoc, updateDoc, doc, serverTimestamp, query, where, limit } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { criarContaSemTrocarSessao } from "../../firebase/criarConta";
import { registrarAuditoria } from "../../firebase/auditoria";
import { useAuth } from "../../contexts/AuthContext";
import { useSetores } from "../../hooks/useSetores";
import { useEscClose } from "../../hooks/useEscClose";
import { EstadoVazio } from "../../components/EstadoVazio";
import { SkeletonGrade } from "../../components/Skeleton";
import { IcoAlerta, IcoCadeado, IcoCarro, IcoCheckCirculo, IcoCredencial, IcoEmail, IcoJornal, IcoPessoa, IcoPrancheta, IcoPredio, IcoX } from "../../components/Icone";
import type { Perfil } from "../../types";

interface UsuarioConta { id:string; nome:string; email:string; setor:string; matricula:string; numeroCnh?:string; vencimentoCnh?:string; ativo:boolean; perfil:Perfil; anonimizado?:boolean; }

const PERFIL_LABEL: Record<string, string> = { usuario:"Usuário", consulta:"Consulta", auditor:"Auditor" };

function statusCnh(vencimento?: string): { cor: string; bg: string; texto: string } | null {
  if (!vencimento) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(vencimento + "T00:00:00");
  const dias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000*60*60*24));
  if (dias < 0) return { cor:"#991b1b", bg:"#fee2e2", texto:`CNH vencida ${Math.abs(dias)}d atrás` };
  if (dias <= 30) return { cor:"#991b1b", bg:"#fee2e2", texto:`CNH vence em ${dias}d` };
  if (dias <= 60) return { cor:"#854d0e", bg:"#fef9c3", texto:`CNH vence em ${dias}d` };
  return { cor:"#166534", bg:"#dcfce7", texto:`CNH válida até ${venc.toLocaleDateString("pt-BR")}` };
}
interface SolicitacaoAcesso {
  id:string; nomeCompleto:string; email:string; matricula:string; setor:string;
  numeroCnh:string; vencimentoCnh:string; numeroDiario:string; dataPublicacao:string; numeroResolucao:string; status:string;
  criadoEm?: { toDate?:()=>Date };
}

export default function Usuarios() {
  const { usuario } = useAuth();
  // Permite abrir direto na aba de solicitações via /gestor/usuarios?aba=solicitacoes
  // (usado pelo atalho "Solicitações de Acesso" das Ações Rápidas do dashboard).
  const [params] = useSearchParams();
  const [aba, setAba] = useState<"usuarios"|"solicitacoes">(
    params.get("aba") === "solicitacoes" ? "solicitacoes" : "usuarios"
  );
  const [lista, setLista] = useState<UsuarioConta[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [solSelecionada, setSolSelecionada] = useState<SolicitacaoAcesso|null>(null);
  const [aprovando, setAprovando] = useState(false);
  const [editForm, setEditForm] = useState({ nomeCompleto:"", email:"", matricula:"", setor:"", numeroCnh:"", vencimentoCnh:"" });
  const [form, setForm] = useState({ nome:"", email:"", senha:"", setor:"", matricula:"", perfil:"usuario" as Perfil });
  const [erroModal, setErroModal] = useState("");
  const [erroSol, setErroSol] = useState("");
  const [sucessoMsg, setSucessoMsg] = useState("");
  const [confirmRecusar, setConfirmRecusar] = useState(false);
  const [confirmAnonimizar, setConfirmAnonimizar] = useState<UsuarioConta|null>(null);
  const setores = useSetores();

  useEscClose(() => setModal(false), modal);
  useEscClose(() => setSolSelecionada(null), !!solSelecionada);

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    setCarregando(true);
    const [condSnap, solSnap] = await Promise.all([
      getDocs(query(collection(db, "usuarios"), where("perfil","in",["usuario","consulta","auditor"]), limit(500))),
      getDocs(query(collection(db, "solicitacoesAcesso"), where("status","==","pendente"), limit(200))),
    ]);
    setLista(condSnap.docs.map(d => ({ id:d.id, ...d.data() } as UsuarioConta)));
    setSolicitacoes(solSnap.docs.map(d => ({ id:d.id, ...d.data() } as SolicitacaoAcesso)));
    setCarregando(false);
  }

  function abrirSolicitacao(sol: SolicitacaoAcesso) {
    setSolSelecionada(sol);
    setErroSol("");
    setEditForm({
      nomeCompleto: sol.nomeCompleto,
      email: sol.email,
      matricula: sol.matricula,
      setor: sol.setor,
      numeroCnh: sol.numeroCnh,
      vencimentoCnh: sol.vencimentoCnh,
    });
  }

  async function aprovar() {
    if (!solSelecionada) return;
    setAprovando(true);
    try {
      const senha = Math.random().toString(36).slice(-8) + "Aa1!";
      // Cria a conta numa instância secundária para NÃO deslogar o gestor.
      const novoUid = await criarContaSemTrocarSessao(editForm.email, senha);
      // IMPORTANTE: usar setDoc com o UID como ID do documento para que
      // AuthContext e as Security Rules possam buscar por getDoc(doc(db,"usuarios",uid))
      await setDoc(doc(db, "usuarios", novoUid), {
        uid: novoUid,
        nome: editForm.nomeCompleto,
        email: editForm.email,
        perfil: "usuario",
        setor: editForm.setor,
        matricula: editForm.matricula,
        numeroCnh: editForm.numeroCnh,
        vencimentoCnh: editForm.vencimentoCnh,
        ativo: true,
        criadoEm: serverTimestamp(),
      });
      await sendPasswordResetEmail(auth, editForm.email);
      await updateDoc(doc(db, "solicitacoesAcesso", solSelecionada.id), { status:"aprovada" });
      setSolSelecionada(null);
      await carregarTudo();
      setSucessoMsg(`Usuário aprovado! E-mail enviado para ${editForm.email} com o link para definir a senha.`);
    } catch(e: unknown) {
      const err = e as { code?:string };
      if (err.code === "auth/email-already-in-use") setErroSol("Este e-mail já está cadastrado.");
      else { console.error(e); setErroSol("Erro ao aprovar. Tente novamente."); }
    } finally { setAprovando(false); }
  }

  async function recusar() {
    if (!solSelecionada) return;
    await updateDoc(doc(db, "solicitacoesAcesso", solSelecionada.id), { status:"recusada" });
    setSolSelecionada(null);
    setConfirmRecusar(false);
    await carregarTudo();
  }

  async function salvarNovoUsuario() {
    setErroModal("");
    if (!form.nome || !form.email || !form.setor) { setErroModal("Preencha todos os campos obrigatórios."); return; }
    setSalvando(true);
    try {
      // Senha aleatória descartável: o gestor nunca conhece a senha do usuário.
      // A conta é criada e um e-mail de definição de senha é enviado — mesmo padrão
      // seguro já usado na aprovação de solicitação de acesso (unificado em 2026-07-19).
      const senhaDescartavel = Math.random().toString(36).slice(-10) + "Aa1!";
      // Cria a conta numa instância secundária para NÃO deslogar o gestor.
      const novoUid = await criarContaSemTrocarSessao(form.email, senhaDescartavel);
      await setDoc(doc(db, "usuarios", novoUid), {
        uid: novoUid, nome: form.nome, email: form.email, perfil: form.perfil,
        setor: form.setor, matricula: form.matricula, ativo: true, criadoEm: serverTimestamp(),
      });
      await sendPasswordResetEmail(auth, form.email);
      setModal(false);
      setForm({ nome:"", email:"", senha:"", setor:"", matricula:"", perfil:"usuario" });
      carregarTudo();
      setSucessoMsg(`Usuário ${form.nome} cadastrado! E-mail enviado para ${form.email} definir a senha de acesso.`);
    } catch(e: unknown) {
      const err = e as { code?:string };
      if (err.code === "auth/email-already-in-use") setErroModal("Este e-mail já está cadastrado.");
      else { console.error(e); setErroModal("Erro ao cadastrar. Tente novamente."); }
    } finally { setSalvando(false); }
  }

  async function toggleAtivo(c: UsuarioConta) {
    await updateDoc(doc(db, "usuarios", c.id), { ativo: !c.ativo });
    carregarTudo();
  }

  // Retenção/LGPD: substitui os dados pessoais por valores anonimizados, mantendo o
  // documento (uid/perfil) para integridade da trilha de auditoria. Só para contas
  // inativas — o registro histórico é preservado sem o dado pessoal.
  async function anonimizar(c: UsuarioConta) {
    await updateDoc(doc(db, "usuarios", c.id), {
      nome: "Usuário anonimizado", email: "", matricula: "",
      numeroCnh: "", vencimentoCnh: "", setor: "",
      anonimizado: true, anonimizadoEm: serverTimestamp(),
    });
    await registrarAuditoria("anonimizar_usuario", usuario?.uid || "", usuario?.nome || "", {
      usuarioAnonimizadoId: c.id, perfil: c.perfil,
    });
    setConfirmAnonimizar(null);
    setSucessoMsg("Dados pessoais anonimizados. O registro foi mantido sem o dado pessoal para a trilha de auditoria.");
    carregarTudo();
  }


  return (
    <div style={s.page}>
      <Sidebar perfil="gestor" />

      <main style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Usuários</div>
            <div style={s.sub}>Gerencie os usuários e solicitações de acesso</div>
          </div>
          <button onClick={() => setModal(true)} style={s.btnNovo}>+ Novo Usuário</button>
        </div>

        <div style={{ padding:"20px 24px", flex:1, overflowY:"auto" }}>
          {sucessoMsg && (
            <div role="status" aria-live="polite" style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#166534", marginBottom:12, fontWeight:500, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span><IcoCheckCirculo tam={14}/> {sucessoMsg}</span>
              <button onClick={()=>setSucessoMsg("")} aria-label="Fechar notificação" style={{ background:"none", border:"none", color:"#166534", cursor:"pointer", fontSize:15, padding:"0 4px" }}><IcoX tam={14}/></button>
            </div>
          )}
          {/* Abas */}
          <div style={{ display:"flex", gap:4, marginBottom:"1.5rem", background:"#F1F5F9", borderRadius:8, padding:4, width:"fit-content", border:"1px solid #E1EAF5" }}>
            <button onClick={() => setAba("usuarios")} style={{ ...s.abaBtn, ...(aba==="usuarios" ? s.abaAtiva : {}) }}>
               Usuários ({lista.length})
            </button>
            <button onClick={() => setAba("solicitacoes")} style={{ ...s.abaBtn, ...(aba==="solicitacoes" ? s.abaAtiva : {}) }}>
               Solicitações de Acesso
              {solicitacoes.length > 0 && <span style={s.badge}>{solicitacoes.length}</span>}
            </button>
          </div>

          {carregando ? (
            <SkeletonGrade itens={6} />
          ) : (
            <>
              {/* Aba Usuários */}
              {aba === "usuarios" && (
                lista.length === 0 ? (
                  <EstadoVazio
                    icone={<IcoPessoa tam={22} />}
                    titulo="Nenhum usuário cadastrado"descricao="Use o botão “Novo Usuário” para cadastrar um servidor, ou aprove uma solicitação pendente na aba ao lado."/>
                ) : (
                  <div style={s.grid}>
                    {lista.map(c => {
                      const initials = c.nome.split(" ").slice(0,2).map((n:string)=>n[0]).join("").toUpperCase();
                      // Avatar usa só tons do accent — antes eram 6 cores decorativas (rosa, ciano, roxo...)
                      const pal = { bg: "#DBEAFE", color: "#1E40AF" };
                      return (
                      <div key={c.id} style={s.card}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                          <div style={{ width:44, height:44, borderRadius:"50%", background:pal.bg, color:pal.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, letterSpacing:-0.5 }}>{initials}</div>
                          <span style={{ ...s.badgeStatus, ...(c.ativo ? { background:"#dcfce7", color:"#166534" } : { background:"#fee2e2", color:"#991b1b" }) }}>{c.ativo ? "Ativo" : "Inativo"}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                          <div style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{c.nome}</div>
                          <span style={{ fontSize:11, fontWeight:700, color:"#5A7A9A", background:"#F1F5F9", borderRadius:99, padding:"1px 8px" }}>{PERFIL_LABEL[c.perfil] || c.perfil}</span>
                        </div>
                        <div style={{ fontSize:13, color:"#5A7A9A", marginBottom:2 }}><IcoEmail tam={14}/> {c.email}</div>
                        <div style={{ fontSize:13, color:"#5A7A9A", marginBottom:2 }}><IcoPredio tam={14}/> {c.setor}</div>
                        {c.matricula && <div style={{ fontSize:13, color:"#5A7A9A", marginBottom:4 }}><IcoCredencial tam={14}/> {c.matricula}</div>}
                        {c.numeroCnh && (() => {
                          const st = statusCnh(c.vencimentoCnh);
                          return (
                            <div style={{ marginBottom:10 }}>
                              <div style={{ fontSize:12, color:"#7A95B2", marginBottom:3 }}>
                                <IcoCredencial tam={14}/> CNH {c.numeroCnh}
                              </div>
                              {st && (
                                <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:99, color:st.cor, background:st.bg, border:`1px solid ${st.cor}40` }}>
                                  {st.texto}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {c.anonimizado && (
                          <div style={{ fontSize:11, fontWeight:700, color:"#5A7A9A", background:"#F1F5F9", border:"1px solid #E1EAF5", borderRadius:8, padding:"6px 10px", marginBottom:8 }}>
                            <IcoCadeado tam={14}/> Dados pessoais anonimizados (LGPD)
                          </div>
                        )}
                        {!c.anonimizado && (
                          <button onClick={() => toggleAtivo(c)} style={{ ...s.btnToggle, ...(c.ativo ? { color:"#991b1b", borderColor:"#fecaca", background:"#fff5f5" } : { color:"#166534", borderColor:"#bbf7d0", background:"#f0fdf4" }) }}>
                            {c.ativo ? "Desativar usuário" : "Reativar usuário"}
                          </button>
                        )}
                        {!c.ativo && !c.anonimizado && (
                          <button onClick={() => setConfirmAnonimizar(c)} style={{ ...s.btnToggle, marginTop:6, color:"#7A95B2", borderColor:"#E1EAF5", background:"#F8FAFC", display:"inline-flex", alignItems:"center", gap:6 }}>
                            <IcoCadeado tam={13} /> Anonimizar dados (LGPD)
                          </button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Aba Solicitações */}
              {aba === "solicitacoes" && (
                solicitacoes.length === 0 ? (
                  <EstadoVazio
                    icone={<IcoPrancheta tam={22} />}
                    titulo="Nenhuma solicitação pendente"descricao="Solicitações enviadas pelo formulário público de cadastro aparecem aqui para aprovação."/>
                ) : (
                  <div style={s.grid}>
                    {solicitacoes.map(sol => {
                      const initSol = sol.nomeCompleto.split(" ").slice(0,2).map((n:string)=>n[0]).join("").toUpperCase();
                      return (
                      <div key={sol.id} style={{ ...s.card, cursor:"pointer" }} onClick={() => abrirSolicitacao(sol)}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                          <div style={{ width:44, height:44, borderRadius:"50%", background:"#fef9c3", color:"#854d0e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, letterSpacing:-0.5 }}>{initSol}</div>
                          <span style={{ ...s.badgeStatus, background:"#fef9c3", color:"#854d0e" }}>Pendente</span>
                        </div>
                        <div style={{ fontSize:15, fontWeight:700, color:"#0F172A", marginBottom:4 }}>{sol.nomeCompleto}</div>
                        <div style={{ fontSize:13, color:"#5A7A9A", marginBottom:2 }}><IcoEmail tam={14}/> {sol.email}</div>
                        <div style={{ fontSize:13, color:"#5A7A9A", marginBottom:2 }}> {sol.setor}</div>
                        <div style={{ fontSize:13, color:"#5A7A9A", marginBottom:2 }}> Mat: {sol.matricula}</div>
                        <div style={{ fontSize:13, color:"#5A7A9A", marginBottom:12 }}><IcoCarro tam={14}/> CNH: {sol.numeroCnh}</div>
                        <div style={{ fontSize:12, color:"#1E3A8A", fontWeight:600 }}>Clique para analisar →</div>
                      </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal novo usuário manual */}
      {modal && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-novo-usuario-titulo">
          <div style={s.modal}>
            <h2 id="modal-novo-usuario-titulo" style={{ fontSize:18, fontWeight:700, color:"#0F172A", marginBottom:"1.5rem" }}>Novo Usuário</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              {[
                { label:"Nome completo", key:"nome", placeholder:"João da Silva" },
                { label:"E-mail", key:"email", placeholder:"joao@cge.ms.gov.br", type:"email" },
                { label:"Matrícula", key:"matricula", placeholder:"000001 (opcional)" },
              ].map(f => (
                <div key={f.key}>
                  <label htmlFor={`novo-usuario-${f.key}`} style={s.label}>{f.label}</label>
                  <input id={`novo-usuario-${f.key}`} type={f.type||"text"} placeholder={f.placeholder} value={(form as Record<string,string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]:e.target.value }))} style={s.input} />
                </div>
              ))}
              <div>
                <label htmlFor="novo-usuario-setor" style={s.label}>Setor</label>
                <select id="novo-usuario-setor" value={form.setor} onChange={e => setForm(p => ({ ...p, setor:e.target.value }))} style={s.input}>
                  <option value="">Selecione...</option>
                  {setores.map(st => <option key={st.id} value={st.nome}>{st.nome}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="novo-usuario-perfil" style={s.label}>Perfil</label>
                <select id="novo-usuario-perfil" value={form.perfil} onChange={e => setForm(p => ({ ...p, perfil:e.target.value as Perfil }))} style={s.input}>
                  <option value="usuario">Usuário — reserva veículos, salas e equipamentos</option>
                  <option value="consulta">Consulta — só leitura, só calendários</option>
                  <option value="auditor">Auditor — só leitura da auditoria e relatórios</option>
                </select>
              </div>
            </div>
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 12px", fontSize:12, color:"#1e40af", margin:"1rem 0" }}>
              <IcoEmail tam={14}/> O usuário receberá um e-mail para definir a própria senha de acesso. O gestor não define a senha.
            </div>
            {erroModal && (
              <div role="alert" style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:"1rem", fontWeight:500 }}>
                <IcoAlerta tam={14}/> {erroModal}
              </div>
            )}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => { setModal(false); setErroModal(""); }} style={{ ...s.btn, background:"#F1F5F9", color:"#5A7A9A", border:"1px solid #E1EAF5" }}>Cancelar</button>
              <button onClick={salvarNovoUsuario} disabled={salvando} style={{ ...s.btn, background:"#3B82F6" }}>{salvando ? "Cadastrando..." : "Cadastrar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal análise de solicitação */}
      {solSelecionada && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-analise-titulo">
          <div style={{ ...s.modal, maxWidth:560 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <h2 id="modal-analise-titulo" style={{ fontSize:18, fontWeight:700, color:"#0F172A", margin:0 }}>Analisar Solicitação</h2>
              <button onClick={() => setSolSelecionada(null)} aria-label="Fechar modal" style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#7A95B2" }}><IcoX tam={14}/></button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", marginBottom:"1.25rem" }}>
              <p style={{ fontSize:12, color:"#7A95B2", margin:0 }}>Você pode editar os dados antes de aprovar.</p>
              {[
                { label:"Nome Completo", key:"nomeCompleto" },
                { label:"E-mail Institucional", key:"email", type:"email" },
                { label:"Matrícula", key:"matricula" },
                { label:"Número da CNH", key:"numeroCnh" },
                { label:"Vencimento da CNH", key:"vencimentoCnh", type:"date" },
              ].map(f => (
                <div key={f.key}>
                  <label htmlFor={`analise-${f.key}`} style={s.label}>{f.label}</label>
                  <input id={`analise-${f.key}`} type={f.type||"text"} value={(editForm as Record<string,string>)[f.key]}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]:e.target.value }))} style={s.input} />
                </div>
              ))}
              <div>
                <label htmlFor="analise-setor" style={s.label}>Setor</label>
                <select id="analise-setor" value={editForm.setor} onChange={e => setEditForm(p => ({ ...p, setor:e.target.value }))} style={s.input}>
                  <option value="">Selecione...</option>
                  {setores.map(st => <option key={st.id} value={st.nome}>{st.nome}</option>)}
                </select>
              </div>
            </div>

              <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"12px 14px", marginBottom:"1.25rem" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1e40af", marginBottom:8 }}><IcoJornal tam={14}/> Publicação no Diário Oficial do Estado de MS</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:13 }}>
                  <div><span style={{ color:"#7A95B2" }}>Nº do Diário:</span><br/><strong style={{ color:"#0F172A" }}>{solSelecionada.numeroDiario}</strong></div>
                  <div><span style={{ color:"#7A95B2" }}>Data de Publicação:</span><br/><strong style={{ color:"#0F172A" }}>{solSelecionada.dataPublicacao}</strong></div>
                  <div style={{ gridColumn:"1/-1" }}><span style={{ color:"#7A95B2" }}>Nº da Resolução:</span><br/><strong style={{ color:"#0F172A" }}>{solSelecionada.numeroResolucao}</strong></div>
                </div>
              </div>

            <div style={{ background:"#fef9c3", border:"1px solid #fde68a", borderRadius:8, padding:"10px 12px", fontSize:12, color:"#854d0e", marginBottom:"1rem" }}>
              <IcoAlerta tam={14}/> Ao aprovar, o usuário receberá um e-mail para definir sua senha de acesso.
            </div>

            {erroSol && (
              <div role="alert" style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:"1rem", fontWeight:500 }}>
                <IcoAlerta tam={14}/> {erroSol}
              </div>
            )}

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setConfirmRecusar(true)} style={{ ...s.btn, background:"#EF4444" }}><IcoX tam={14}/> Recusar</button>
              <button onClick={aprovar} disabled={aprovando} style={{ ...s.btn, background:"#22C55E" }}>
                {aprovando ? "Aprovando..." : " Aprovar e Enviar Acesso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRecusar && solSelecionada && (
        <ModalConfirm
          titulo="Recusar Solicitação"mensagem={`Deseja recusar a solicitação de acesso de ${solSelecionada.nomeCompleto}? O solicitante não receberá acesso ao sistema.`}
          labelConfirmar="Sim, recusar"labelCancelar="Voltar"corConfirmar="#EF4444"onConfirmar={recusar}
          onCancelar={() => setConfirmRecusar(false)}
        />
      )}

      {confirmAnonimizar && (
        <ModalConfirm
          titulo="Anonimizar dados (LGPD)"mensagem={`Deseja anonimizar os dados pessoais de ${confirmAnonimizar.nome}? Nome, e-mail, matrícula, CNH e setor serão apagados. O registro é mantido (sem dado pessoal) para a trilha de auditoria. Esta ação não pode ser desfeita.`}
          labelConfirmar="Sim, anonimizar"labelCancelar="Voltar"corConfirmar="#334155"onConfirmar={() => anonimizar(confirmAnonimizar)}
          onCancelar={() => setConfirmAnonimizar(null)}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:       { display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Sora', system-ui, sans-serif" },
  main:       { flex:1, display:"flex", flexDirection:"column", minWidth:0, overflowY:"auto" },
  topbar:     { background:"#ffffff", borderBottom:"1.5px solid #E1EAF5", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 },
  title:      { fontSize:18, fontWeight:700, color:"#0F172A" },
  sub:        { color:"#7A95B2", fontSize:12, marginTop:2 },
  btnNovo:    { background:"#1E3A8A", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer" },
  loading:    { textAlign:"center", padding:"4rem", color:"#7A95B2" },
  vazio:      { textAlign:"center", padding:"4rem", color:"#7A95B2" },
  grid:       { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"1rem" },
  card:       { background:"#ffffff", border:"1px solid #E1EAF5", borderRadius:12, padding:"1.25rem", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  badge:      { background:"#fee2e2", color:"#991b1b", borderRadius:99, fontSize:11, fontWeight:700, padding:"2px 7px", marginLeft:6 },
  badgeStatus:{ padding:"4px 10px", borderRadius:99, fontSize:12, fontWeight:700 },
  btnToggle:  { width:"100%", padding:"8px", border:"1px solid #E1EAF5", borderRadius:8, background:"#F8FAFC", fontSize:13, cursor:"pointer", color:"#5A7A9A" },
  abaBtn:     { padding:"8px 16px", border:"none", borderRadius:8, background:"transparent", color:"#7A95B2", fontSize:13, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center" },
  abaAtiva:   { background:"#ffffff", color:"#0F172A", fontWeight:700, boxShadow:"0 1px 3px rgba(0,0,0,0.08)" },
  overlay:    { position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(2px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:      { background:"#ffffff", borderRadius:12, padding:"2rem", width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" },
  label:      { display:"block", fontSize:12, color:"#5A7A9A", marginBottom:4, fontWeight:600 },
  input:      { width:"100%", padding:"9px 12px", border:"1px solid #E1EAF5", borderRadius:8, fontSize:13, boxSizing:"border-box", background:"#fff", color:"#0F172A", fontFamily:"inherit" },
  btn:        { padding:"10px 20px", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" },
};
