import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase/config";
import { sendPasswordResetEmail, getMultiFactorResolver, TotpMultiFactorGenerator, type MultiFactorResolver } from "firebase/auth";
import { CalendarioGrade } from "./CalendarioGrade";

const STATUS_SALAS_PUBLICO = {
  confirmada: { cor:"#3B82F6", label:"Reservada" },
  cancelada:  { cor:"#94A3B8", label:"Cancelada" },
};

// Ícone de calendário das abas (SVG em currentColor — herda a cor do botão).
// O ícone do modelo usa emoji colorido: 🚗 e 🚪 são emojis antigos, suportados no
// Windows 10 (o tofu só acontecia com 🛻, recente). Ver memória win10-emoji-tofu.
const IcoCalendarioAba = <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;

export default function Login() {
  const {login}  = useAuth();
  const navigate = useNavigate();
  const [email,setEmail]         = useState("");
  const [senha,setSenha]         = useState("");
  const [erro,setErro]           = useState("");
  const [load,setLoad]           = useState(false);
  const [show,setShow]           = useState(false);
  const [modoReset,setModoReset] = useState(false);
  const [emailReset,setEmailReset] = useState("");
  const [resetLoad,setResetLoad] = useState(false);
  const [resetOk,setResetOk]     = useState(false);
  const [erroReset,setErroReset] = useState("");
  const [abaCalendario,setAbaCalendario] = useState<"veiculos"|"salas">("veiculos");
  const [mfaResolver,setMfaResolver] = useState<MultiFactorResolver|null>(null);
  const [mfaCode,setMfaCode] = useState("");

  async function handleReset(e:React.FormEvent){
    e.preventDefault(); setErroReset(""); setResetLoad(true);
    if(!emailReset.trim()){setErroReset("Informe seu e-mail institucional.");setResetLoad(false);return;}
    try{
      await sendPasswordResetEmail(auth, emailReset.trim());
      setResetOk(true);
    }catch(err:unknown){
      const c=(err as {code?:string}).code??"";
      const map:Record<string,string>={"auth/user-not-found":"E-mail não encontrado.","auth/invalid-email":"E-mail inválido.","auth/too-many-requests":"Muitas tentativas. Aguarde."};
      setErroReset(map[c]??"Erro ao enviar e-mail. Tente novamente.");
    }finally{setResetLoad(false);}
  }

  async function irParaDashboard(){
    const {getDoc,doc}=await import("firebase/firestore");
    const {db:_db}    =await import("../firebase/config");
    const snap=await getDoc(doc(_db,"usuarios",auth.currentUser!.uid));
    const perfil=snap.data()?.perfil;
    const destino=perfil==="gestor"||perfil==="usuario"||perfil==="consulta"||perfil==="auditor" ? `/${perfil}` : "/consulta";
    navigate(destino,{replace:true});
  }

  async function handleLogin(e:React.FormEvent){
    e.preventDefault(); setErro(""); setLoad(true);
    try{
      await login(email,senha);
      await irParaDashboard();
    }catch(err:unknown){
      const c=(err as {code?:string}).code??"";
      // Conta com 2FA ativo: o login pede o código do autenticador
      if(c==="auth/multi-factor-auth-required"){ setMfaResolver(getMultiFactorResolver(auth, err as never)); return; }
      const map:Record<string,string>={"auth/invalid-credential":"E-mail ou senha incorretos.","auth/too-many-requests":"Muitas tentativas. Aguarde."};
      setErro(map[c]??"Erro ao fazer login.");
    }finally{setLoad(false);}
  }

  async function resolverMfa(e:React.FormEvent){
    e.preventDefault(); setErro(""); setLoad(true);
    if(!mfaResolver||mfaCode.length<6){ setErro("Informe o código de 6 dígitos do aplicativo."); setLoad(false); return; }
    try{
      const assertion=TotpMultiFactorGenerator.assertionForSignIn(mfaResolver.hints[0].uid, mfaCode);
      await mfaResolver.resolveSignIn(assertion);
      await irParaDashboard();
    }catch{
      setErro("Código incorreto. Confira no aplicativo e tente de novo.");
    }finally{setLoad(false);}
  }

  return(
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"'Sora',system-ui,sans-serif"}}>

      {/* ── ESQUERDA ── */}
      <div style={{width:340,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 28px",boxShadow:"4px 0 24px rgba(0,0,0,0.1)",position:"relative",zIndex:2,flexShrink:0}}>

        {/* CGE badge */}
        <div style={{background:"#1E3A8A",borderRadius:6,padding:"6px 16px",marginBottom:6}}>
          <span style={{fontWeight:900,fontSize:18,color:"#fff",letterSpacing:1}}>CGE</span>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:"#1E3A8A",textAlign:"center",letterSpacing:0.5,marginBottom:16,lineHeight:1.4}}>CONTROLADORIA-GERAL<br/>DO ESTADO DE MS</div>

        {/* Ícone */}
        <div style={{width:68,height:68,borderRadius:"50%",background:"#EFF6FF",border:"2px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <div style={{fontSize:24,fontWeight:900,color:"#0F172A",letterSpacing:-0.5,marginBottom:2}}>Hub</div>
        <div style={{fontSize:11,color:"#64748B",marginBottom:16,textAlign:"center"}}>Central de Recursos Compartilhados</div>

        {/* Card */}
        <div style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:12,padding:"20px 18px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",marginBottom:12}}>
          {resetOk ? (
            /* ── Sucesso ── */
            <div style={{textAlign:"center",padding:"8px 0"}}>
              <div style={{fontSize:44,marginBottom:12}}></div>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:8}}>E-mail enviado!</div>
              <p style={{fontSize:13,color:"#64748B",marginBottom:20,lineHeight:1.5}}>
                Um link de redefinição foi enviado para <strong>{emailReset}</strong>.<br/>Verifique sua caixa de entrada.
              </p>
              <button type="button" onClick={()=>{setResetOk(false);setModoReset(false);setErroReset("");}}
                style={{width:"100%",padding:"12px",background:"#1E3A8A",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                ← Voltar ao login
              </button>
            </div>
          ) : mfaResolver ? (
            /* ── Desafio 2FA (código do autenticador) ── */
            <>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:6,textAlign:"center"}}>Verificação em <span style={{color:"#1E3A8A"}}>duas etapas</span></div>
              <p style={{fontSize:12,color:"#64748B",textAlign:"center",marginBottom:18,lineHeight:1.5}}>Digite o código de 6 dígitos<br/>do seu aplicativo autenticador.</p>
              <form onSubmit={resolverMfa} noValidate>
                <div style={{marginBottom:14}}>
                  <label htmlFor="mfa-code" style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Código de verificação</label>
                  <input id="mfa-code" value={mfaCode} required inputMode="numeric" autoFocus placeholder="000000"onChange={e=>{setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6));setErro("");}}
                    style={{width:"100%",padding:"10px 12px",border:"1.5px solid #E2E8F0",borderRadius:8,fontSize:18,letterSpacing:6,textAlign:"center",boxSizing:"border-box",background:"#FAFAFA",fontFamily:"inherit",color:"#0F172A"}}/>
                </div>
                {erro&&<div role="alert" style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#DC2626",marginBottom:10,textAlign:"center"}}>{erro}</div>}
                <button type="submit" disabled={load}
                  style={{width:"100%",padding:"12px",background:load?"#94A3B8":"#1E3A8A",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:load?"not-allowed":"pointer",marginBottom:8}}>
                  {load?"Verificando...":"Verificar e entrar"}
                </button>
                <button type="button" onClick={()=>{setMfaResolver(null);setMfaCode("");setErro("");}}
                  style={{width:"100%",padding:"10px",background:"none",border:"1px solid #E2E8F0",borderRadius:8,fontSize:13,color:"#64748B",cursor:"pointer",fontFamily:"inherit"}}>
                  ← Voltar ao login
                </button>
              </form>
            </>
          ) : modoReset ? (
            /* ── Formulário de reset ── */
            <>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:6,textAlign:"center"}}>Redefinir <span style={{color:"#1E3A8A"}}>senha</span></div>
              <p style={{fontSize:12,color:"#64748B",textAlign:"center",marginBottom:18,lineHeight:1.5}}>Informe seu e-mail e enviaremos<br/>um link de redefinição.</p>
              <form onSubmit={handleReset} noValidate>
                <div style={{marginBottom:14}}>
                  <label htmlFor="reset-email" style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>E-mail institucional</label>
                  <input id="reset-email" type="email" value={emailReset} required placeholder="gestor@frota.ms.gov.br"autoFocus
                    onChange={e=>{setEmailReset(e.target.value);setErroReset("");}}
                    style={{width:"100%",padding:"9px 12px",border:"1.5px solid #E2E8F0",borderRadius:8,fontSize:13,boxSizing:"border-box",background:"#FAFAFA",fontFamily:"inherit",color:"#0F172A"}}/>
                </div>
                {erroReset&&<div role="alert" style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#DC2626",marginBottom:10,textAlign:"center"}}>{erroReset}</div>}
                <button type="submit" disabled={resetLoad}
                  style={{width:"100%",padding:"12px",background:resetLoad?"#94A3B8":"#1E3A8A",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:resetLoad?"not-allowed":"pointer",marginBottom:8}}>
                  {resetLoad?"Enviando...":"Enviar link de redefinição"}
                </button>
                <button type="button" onClick={()=>{setModoReset(false);setErroReset("");}}
                  style={{width:"100%",padding:"10px",background:"none",border:"1px solid #E2E8F0",borderRadius:8,fontSize:13,color:"#64748B",cursor:"pointer",fontFamily:"inherit"}}>
                  ← Voltar ao login
                </button>
              </form>
            </>
          ) : (
            /* ── Login normal ── */
            <>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:18,textAlign:"center"}}>Acesse sua <span style={{color:"#1E3A8A"}}>conta</span></div>

              <form onSubmit={handleLogin} noValidate>
                {/* Email */}
                <div style={{marginBottom:12}}>
                  <label htmlFor="login-email" style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>E-mail institucional</label>
                  <div style={{position:"relative"}}>
                    <svg aria-hidden="true" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input id="login-email" type="email" value={email} required placeholder="gestor@frota.ms.gov.br"aria-required="true" aria-describedby={erro ? "login-erro" : undefined}
                      onChange={e=>{setEmail(e.target.value);setErro("");}}
                      style={{width:"100%",padding:"9px 12px 9px 32px",border:"1.5px solid #E2E8F0",borderRadius:8,fontSize:13,boxSizing:"border-box",background:"#FAFAFA",fontFamily:"inherit",color:"#0F172A"}}/>
                  </div>
                </div>

                {/* Senha */}
                <div style={{marginBottom:10}}>
                  <label htmlFor="login-senha" style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Senha</label>
                  <div style={{position:"relative"}}>
                    <svg aria-hidden="true" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input id="login-senha" type={show?"text":"password"} value={senha} required placeholder="••••••••"aria-required="true" aria-describedby={erro ? "login-erro" : undefined}
                      onChange={e=>{setSenha(e.target.value);setErro("");}}
                      style={{width:"100%",padding:"9px 36px 9px 32px",border:"1.5px solid #E2E8F0",borderRadius:8,fontSize:13,boxSizing:"border-box",background:"#FAFAFA",fontFamily:"inherit",color:"#0F172A"}}
                      autoComplete="current-password"/>
                    <button type="button" onClick={()=>setShow(p=>!p)}
                      aria-label={show ? "Ocultar senha" : "Exibir senha"}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94A3B8",padding:0,display:"flex",alignItems:"center"}}>
                      <span aria-hidden="true">
                      {show
                        ?<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        :<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                      </span>
                    </button>
                  </div>
                </div>

                {/* Esqueci a senha */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:14}}>
                  <button type="button" onClick={()=>{setModoReset(true);setEmailReset(email);setErroReset("");setErro("");}}
                    style={{background:"none",border:"none",fontSize:12,color:"#3B82F6",cursor:"pointer",fontFamily:"inherit"}}>Esqueceu sua senha?</button>
                </div>

                {erro&&<div id="login-erro" role="alert" style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#DC2626",marginBottom:10,textAlign:"center"}}>{erro}</div>}

                <button type="submit" disabled={load}
                  style={{width:"100%",padding:"12px",background:load?"#94A3B8":"#1E3A8A",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:load?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background 0.15s, transform 0.1s"}}>
                  <span>{load?"Autenticando...":"Entrar no sistema"}</span>
                  {!load&&<span style={{fontSize:18}}>›</span>}
                </button>
              </form>

              <div style={{fontSize:11,color:"#94A3B8",textAlign:"center",marginTop:12}}>Acesso restrito a usuários autorizados</div>
            </>
          )}
        </div>

        <button onClick={()=>navigate("/solicitar-acesso")}
          style={{background:"none",border:"1px solid #E2E8F0",borderRadius:8,padding:"9px 16px",fontSize:12,color:"#64748B",cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
          Não possuo acesso — Solicitar cadastro
        </button>
        <button onClick={()=>navigate("/privacidade")}
          style={{background:"none",border:"none",fontSize:11,color:"#94A3B8",cursor:"pointer",fontFamily:"inherit",marginTop:12,textDecoration:"underline"}}>
          Aviso de Privacidade (LGPD)
        </button>
      </div>

      {/* ── DIREITA — Calendário ── */}
      <div style={{flex:1,background:"linear-gradient(135deg,#0B1F3A 0%,#0F172A 60%,#0B2A4A 100%)",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Decoração amarela */}
        <div style={{position:"absolute",bottom:0,right:0,width:280,height:380,background:"linear-gradient(135deg,#FACC15,#F59E0B)",borderRadius:"100% 0 0 0",opacity:0.12,zIndex:0}}/>
        {/* Watermark CGE */}
        <svg viewBox="0 0 220 135" xmlns="http://www.w3.org/2000/svg" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:420,height:258,opacity:0.07,pointerEvents:"none",mixBlendMode:"screen",zIndex:0}}>
          <rect x="5" y="3" width="210" height="90" rx="10" ry="10" fill="#1E3A8A"/>
          <ellipse cx="38" cy="93" rx="42" ry="28" fill="#22c55e" opacity="0.9"/>
          <ellipse cx="30" cy="93" rx="28" ry="20" fill="#FACC15" opacity="0.95"/>
          <text x="118" y="67" textAnchor="middle" fill="white" fontSize="52" fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" letterSpacing="-1">CGE</text>
          <rect x="5"y="96" width="70" height="5" fill="#16A34A"/>
          <rect x="75"y="96" width="70" height="5" fill="#FACC15"/>
          <rect x="145" y="96" width="70" height="5" fill="#1D4ED8"/>
          <text x="110" y="114" textAnchor="middle" fill="white" fontSize="11.5" fontFamily="Arial, sans-serif" fontWeight="400">Controladoria-Geral do Estado</text>
          <text x="110" y="129" textAnchor="middle" fill="white" fontSize="11.5" fontFamily="Arial, sans-serif" fontWeight="400">de Mato Grosso do Sul</text>
        </svg>
        <div style={{flex:1,padding:"40px 48px",overflowY:"auto",position:"relative",zIndex:1}}>
          <div style={{display:"flex",gap:10,marginBottom:20}} role="tablist" aria-label="Selecionar calendário público">
            {(["veiculos","salas"] as const).map(aba=>(
              <button key={aba} type="button" role="tab" aria-selected={abaCalendario===aba}
                onClick={()=>setAbaCalendario(aba)}
                style={{
                  display:"flex",alignItems:"center",gap:8,
                  padding:"12px 22px",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                  border: abaCalendario===aba ? "1px solid #fff" : "1px solid rgba(255,255,255,0.14)",
                  background: abaCalendario===aba ? "#fff" : "rgba(255,255,255,0.07)",
                  color: abaCalendario===aba ? "#0F172A" : "rgba(255,255,255,0.65)",
                  transition:"background 0.15s, color 0.15s",
                }}>
                <span style={{display:"flex"}}>{IcoCalendarioAba}</span>
                <span aria-hidden="true" style={{fontSize:18,lineHeight:1}}>{aba==="veiculos" ? "" : ""}</span>
                {aba==="veiculos" ? "Veículos" : "Salas"}
              </button>
            ))}
          </div>
          {abaCalendario==="veiculos" ? (
            <CalendarioGrade tema="escuro" campoTitulo="veiculoLabel"/>
          ) : (
            <CalendarioGrade
              tema="escuro"colecao="calendarioPublicoSalas"titulo="SALAS DE REUNIÃO"subtitulo="Consulte a disponibilidade pública das salas"campoTitulo="salaNome"campoDataInicio="dataInicio"campoDataFim="dataFim"statusMap={STATUS_SALAS_PUBLICO}
              statusFiltro={["confirmada"]}
            />
          )}
        </div>
      </div>
    </div>
  );
}