import { Suspense } from "react";
import { lazyComRetry } from "./utils/lazyComRetry";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RotaProtegida } from "./components/layout/RotaProtegida";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Login from "./pages/Login";

// Rotas carregadas sob demanda (code-splitting) — tira as telas internas e o
// gerador de PDF (jsPDF/html2canvas) do bundle inicial, que antes vinha inteiro
// já na tela de login. O Login fica eager por ser a landing.
const Privacidade = lazyComRetry(() => import("./pages/Privacidade"));
const SolicitarAcesso = lazyComRetry(() => import("./pages/SolicitarAcesso"));
const DashboardGestor = lazyComRetry(() => import("./pages/gestor/Dashboard"));
const Aprovacoes = lazyComRetry(() => import("./pages/gestor/Aprovacoes"));
const Veiculos = lazyComRetry(() => import("./pages/gestor/Veiculos"));
const Manutencao = lazyComRetry(() => import("./pages/gestor/Manutencao"));
const Relatorios = lazyComRetry(() => import("./pages/gestor/Relatorios"));
const Usuarios = lazyComRetry(() => import("./pages/gestor/Usuarios"));
const ManualUso = lazyComRetry(() => import("./pages/gestor/ManualUso"));
const Auditoria = lazyComRetry(() => import("./pages/gestor/Auditoria"));
const Seguranca = lazyComRetry(() => import("./pages/gestor/Seguranca"));
const Setores = lazyComRetry(() => import("./pages/gestor/Setores"));
const Configuracoes = lazyComRetry(() => import("./pages/gestor/Configuracoes"));
const DashboardUsuario = lazyComRetry(() => import("./pages/usuario/Dashboard"));
const Solicitar = lazyComRetry(() => import("./pages/usuario/Solicitar"));
const MinhasSolicitacoes = lazyComRetry(() => import("./pages/usuario/MinhasSolicitacoes"));
const Checkout = lazyComRetry(() => import("./pages/usuario/Checkout"));
const Checkin = lazyComRetry(() => import("./pages/usuario/Checkin"));
const DashboardConsulta = lazyComRetry(() => import("./pages/consulta/Dashboard"));
const Salas = lazyComRetry(() => import("./pages/salas/Salas"));
const VeiculoProprio = lazyComRetry(() => import("./pages/indenizacao/VeiculoProprio"));
const Indenizacoes = lazyComRetry(() => import("./pages/indenizacao/Indenizacoes"));
const GestorIndenizacoes = lazyComRetry(() => import("./pages/indenizacao/GestorIndenizacoes"));
const Equipamentos = lazyComRetry(() => import("./pages/equipamentos/Equipamentos"));

function Carregando() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', system-ui, sans-serif", color: "#7A95B2", gap: 12 }}>
      <div style={{ width: 28, height: 28, border: "3px solid #E1EAF5", borderTop: "3px solid #3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13 }}>Carregando...</span>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Carregando />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/solicitar-acesso" element={<SolicitarAcesso />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/gestor" element={<RotaProtegida perfil="gestor"><DashboardGestor /></RotaProtegida>} />
          <Route path="/gestor/aprovacoes" element={<RotaProtegida perfil="gestor"><Aprovacoes /></RotaProtegida>} />
          <Route path="/gestor/manual" element={<RotaProtegida perfil="gestor"><ManualUso /></RotaProtegida>} />
          <Route path="/gestor/seguranca" element={<RotaProtegida perfil="gestor"><Seguranca /></RotaProtegida>} />
          <Route path="/gestor/veiculos" element={<RotaProtegida perfil="gestor"><Veiculos /></RotaProtegida>} />
          <Route path="/gestor/manutencao" element={<RotaProtegida perfil="gestor"><Manutencao /></RotaProtegida>} />
          <Route path="/gestor/usuarios" element={<RotaProtegida perfil="gestor"><Usuarios /></RotaProtegida>} />
          <Route path="/gestor/relatorios" element={<RotaProtegida perfil={["gestor","auditor"]}><Relatorios /></RotaProtegida>} />
          <Route path="/gestor/auditoria" element={<RotaProtegida perfil={["gestor","auditor"]}><Auditoria /></RotaProtegida>} />
          <Route path="/auditor" element={<RotaProtegida perfil="auditor"><Auditoria /></RotaProtegida>} />
          <Route path="/gestor/setores" element={<RotaProtegida perfil="gestor"><Setores /></RotaProtegida>} />
          <Route path="/gestor/configuracoes" element={<RotaProtegida perfil="gestor"><Configuracoes /></RotaProtegida>} />
          <Route path="/usuario" element={<RotaProtegida perfil="usuario"><DashboardUsuario /></RotaProtegida>} />
          <Route path="/usuario/solicitar" element={<RotaProtegida perfil="usuario"><Solicitar /></RotaProtegida>} />
          <Route path="/usuario/solicitacoes" element={<RotaProtegida perfil="usuario"><MinhasSolicitacoes /></RotaProtegida>} />
          <Route path="/usuario/checkout/:id" element={<RotaProtegida perfil="usuario"><Checkout /></RotaProtegida>} />
          <Route path="/usuario/checkin/:id" element={<RotaProtegida perfil="usuario"><Checkin /></RotaProtegida>} />
          <Route path="/usuario/veiculo-proprio" element={<RotaProtegida perfil="usuario"><VeiculoProprio /></RotaProtegida>} />
          <Route path="/usuario/indenizacoes" element={<RotaProtegida perfil="usuario"><Indenizacoes /></RotaProtegida>} />
          <Route path="/gestor/indenizacoes" element={<RotaProtegida perfil="gestor"><GestorIndenizacoes /></RotaProtegida>} />
          <Route path="/consulta" element={<RotaProtegida perfil="consulta"><DashboardConsulta /></RotaProtegida>} />
          <Route path="/salas" element={<RotaProtegida><Salas /></RotaProtegida>} />
          <Route path="/equipamentos" element={<RotaProtegida><Equipamentos /></RotaProtegida>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
