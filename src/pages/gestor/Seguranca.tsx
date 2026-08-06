import { useState } from "react";
import QRCode from "qrcode";
import { multiFactor, TotpMultiFactorGenerator, sendEmailVerification } from "firebase/auth";
import { auth } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { Sidebar } from "../../components/layout/Sidebar";
import { IcoAlerta, IcoCadeado, IcoCheckCirculo, IcoEmail } from "../../components/Icone";

interface SegredoTotp {
  secretKey: string;
  generateQrCodeUrl: (accountName?: string, issuer?: string) => string;
}

export default function Seguranca() {
  const { usuario } = useAuth();
  // auth.currentUser já está disponível aqui (rota protegida só renderiza autenticado),
  // então o estado inicial de "2FA ativo" é computado direto, sem effect.
  const [jaAtivo, setJaAtivo] = useState(() => auth.currentUser ? multiFactor(auth.currentUser).enrolledFactors.length > 0 : false);
  const [etapa, setEtapa] = useState<"inicio" | "codigo">("inicio");
  const [segredo, setSegredo] = useState<SegredoTotp | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [codigo, setCodigo] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  // MFA exige e-mail verificado — contas criadas por senha não vêm verificadas.
  const emailVerificado = auth.currentUser?.emailVerified ?? false;
  const [verifEnviado, setVerifEnviado] = useState(false);

  async function enviarVerificacao() {
    setErro(""); setProcessando(true);
    try {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      setVerifEnviado(true);
    } catch {
      setErro("Não foi possível enviar o e-mail de verificação. Tente novamente.");
    } finally { setProcessando(false); }
  }

  async function iniciar() {
    setErro(""); setProcessando(true);
    try {
      const session = await multiFactor(auth.currentUser!).getSession();
      const totp = await TotpMultiFactorGenerator.generateSecret(session) as unknown as SegredoTotp;
      setSegredo(totp);
      try {
        const otpauth = totp.generateQrCodeUrl(usuario?.email || "conta", "Hub CGE-MS");
        setQrDataUrl(await QRCode.toDataURL(otpauth, { width: 200, margin: 1 }));
      } catch { setQrDataUrl(""); /* sem QR: cai no modo chave manual */ }
      setEtapa("codigo");
    } catch (e: unknown) {
      const c = (e as { code?: string }).code ?? "";
      setErro(c === "auth/requires-recent-login"? "Por segurança, saia e faça login de novo antes de ativar o 2FA.": "Não foi possível iniciar a ativação. Tente novamente.");
    } finally { setProcessando(false); }
  }

  async function confirmar() {
    if (!segredo || codigo.length < 6) { setErro("Informe o código de 6 dígitos do aplicativo."); return; }
    setErro(""); setProcessando(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(segredo as never, codigo);
      await multiFactor(auth.currentUser!).enroll(assertion, "App Autenticador");
      setJaAtivo(true); setEtapa("inicio"); setSegredo(null); setCodigo("");
      setSucesso("Verificação em duas etapas ativada! No próximo login o código será solicitado.");
    } catch (e: unknown) {
      const c = (e as { code?: string }).code ?? "";
      setErro(c === "auth/invalid-verification-code"? "Código incorreto. Confira no aplicativo e tente de novo.": "Não foi possível ativar. Tente novamente.");
    } finally { setProcessando(false); }
  }

  async function remover() {
    setErro(""); setProcessando(true);
    try {
      const fatores = multiFactor(auth.currentUser!).enrolledFactors;
      if (fatores[0]) await multiFactor(auth.currentUser!).unenroll(fatores[0]);
      setJaAtivo(false);
      setSucesso("Verificação em duas etapas desativada.");
    } catch {
      setErro("Não foi possível desativar. Saia e faça login de novo, depois tente.");
    } finally { setProcessando(false); }
  }

  return (
    <div style={s.page}>
      <Sidebar perfil="gestor" />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Segurança da Conta</div>
            <div style={s.sub}>Verificação em duas etapas (2FA) por aplicativo autenticador</div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", flex: 1, maxWidth: 560 }}>
          {sucesso && <div style={s.ok} role="status"><IcoCheckCirculo tam={14}/> {sucesso}</div>}
          {erro && <div style={s.erro} role="alert"><IcoAlerta tam={14}/> {erro}</div>}

          <div style={s.card}>
            {jaAtivo ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ ...s.badge, background: "#dcfce7", color: "#166534" }}><IcoCadeado tam={14}/> 2FA Ativo</span>
                </div>
                <p style={s.texto}>Sua conta ({usuario?.email}) exige um código do aplicativo autenticador a cada login. Isso protege o acesso de gestor mesmo que a senha vaze.</p>
                <button onClick={remover} disabled={processando} style={s.btnSecundario}>{processando ? "Processando..." : "Desativar 2FA"}</button>
              </div>
            ) : etapa === "inicio" ? (
              <div>
                <p style={s.texto}>A verificação em duas etapas adiciona uma camada extra de segurança: além da senha, o login passa a exigir um código temporário de um aplicativo autenticador (Google Authenticator, Microsoft Authenticator, etc.). Recomendado para o perfil de gestor.</p>
                {emailVerificado ? (
                  <button onClick={iniciar} disabled={processando} style={s.btnPrimario}>{processando ? "Preparando..." : "Ativar verificação em duas etapas"}</button>
                ) : verifEnviado ? (
                  <div style={{ ...s.texto, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px 14px", color: "#1e40af", marginBottom: 0 }}>
                    <IcoEmail tam={14}/> E-mail de verificação enviado para <strong>{usuario?.email}</strong>. Clique no link do e-mail e depois <strong>recarregue esta página</strong> para ativar o 2FA.
                  </div>
                ) : (
                  <div>
                    <div style={{ ...s.texto, background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 14px", color: "#854d0e" }}>
                      Para ativar o 2FA, seu e-mail (<strong>{usuario?.email}</strong>) precisa estar verificado. Envie o e-mail de verificação, clique no link e volte aqui.
                    </div>
                    <button onClick={enviarVerificacao} disabled={processando} style={s.btnPrimario}>{processando ? "Enviando..." : "Enviar e-mail de verificação"}</button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p style={s.texto}><strong>1.</strong> Escaneie o QR code abaixo com seu aplicativo autenticador (Google Authenticator, Microsoft Authenticator, etc.):</p>
                {qrDataUrl && (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                    <img src={qrDataUrl} alt="QR code para configurar o 2FA no aplicativo autenticador" width={200} height={200} style={{ border: "1px solid #E1EAF5", borderRadius: 8, padding: 8, background: "#fff" }} />
                  </div>
                )}
                <p style={s.textoPequeno}>Não consegue escanear? Adicione uma conta manualmente com esta chave:</p>
                <div style={{ ...s.chave, marginTop: 6 }}>{segredo?.secretKey}</div>
                <p style={{ ...s.texto, marginTop: 14 }}><strong>2.</strong> Digite o código de 6 dígitos que o aplicativo mostrar:</p>
                <input value={codigo} onChange={e => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6)); setErro(""); }}
                  inputMode="numeric" placeholder="000000" aria-label="Código de verificação"style={{ ...s.input, letterSpacing: 6, fontSize: 18, textAlign: "center", maxWidth: 180 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={() => { setEtapa("inicio"); setSegredo(null); setCodigo(""); setErro(""); }} style={s.btnSecundario}>Cancelar</button>
                  <button onClick={confirmar} disabled={processando} style={s.btnPrimario}>{processando ? "Ativando..." : "Confirmar e ativar"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:   { display: "flex", minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', system-ui, sans-serif" },
  main:   { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" },
  topbar: { background: "#ffffff", borderBottom: "1.5px solid #E1EAF5", padding: "14px 24px", flexShrink: 0 },
  title:  { fontSize: 18, fontWeight: 700, color: "#0F172A" },
  sub:    { color: "#7A95B2", fontSize: 12, marginTop: 2 },
  card:   { background: "#fff", border: "1px solid #E1EAF5", borderRadius: 12, padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  texto:  { fontSize: 14, color: "#334155", lineHeight: 1.6, marginTop: 0, marginBottom: 16 },
  textoPequeno: { fontSize: 12, color: "#7A95B2", marginTop: 8, marginBottom: 0 },
  vazio:  { fontSize: 13, color: "#94A3B8" },
  chave:  { fontFamily: "ui-monospace, monospace", fontSize: 15, fontWeight: 700, letterSpacing: 2, color: "#0F172A", background: "#F1F5F9", border: "1px solid #E1EAF5", borderRadius: 8, padding: "12px 14px", wordBreak: "break-all" },
  badge:  { padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 },
  input:  { width: "100%", padding: "10px 12px", border: "1px solid #E1EAF5", borderRadius: 8, boxSizing: "border-box", background: "#fff", color: "#0F172A", fontFamily: "inherit" },
  ok:     { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#166534", fontWeight: 500, marginBottom: 12 },
  erro:   { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626", fontWeight: 500, marginBottom: 12 },
  btnPrimario:   { padding: "10px 20px", border: "none", borderRadius: 8, background: "#1E3A8A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSecundario: { padding: "10px 20px", border: "1px solid #E1EAF5", borderRadius: 8, background: "#F1F5F9", color: "#5A7A9A", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
