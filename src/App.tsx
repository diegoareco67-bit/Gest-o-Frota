import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RotaProtegida } from "./components/layout/RotaProtegida";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Login from "./pages/Login";

// Rotas carregadas sob demanda (code-splitting) — tira as telas internas e o
// gerador de PDF (jsPDF/html2canvas) do bundle inicial, que antes vinha inteiro
// já na tela de login. O Login fica eager por ser a landing.
const Privacidade = lazy(() => import("./pages/Privacidade"));
const SolicitarAcesso = lazy(() => import("./pages/SolicitarAcesso"));
const DashboardGestor = lazy(() => import("./pages/gestor/Dashboard"));
const Aprovacoes = lazy(() => import("./pages/gestor/Aprovacoes"));
const Veiculos = lazy(() => import("./pages/gestor/Veiculos"));
const Manutencao = lazy(() => import("./pages/gestor/Manutencao"));
const Relatorios = lazy(() => import("./pages/gestor/Relatorios"));
const Usuarios = lazy(() => import("./pages/gestor/Usuarios"));
const ManualUso = lazy(() => import("./pages/gestor/ManualUso"));
const Auditoria = lazy(() => import("./pages/gestor/Auditoria"));
const Seguranca = lazy(() => import("./pages/gestor/Seguranca"));
const Setores = lazy(() => import("./pages/gestor/Setores"));
const DashboardUsuario = lazy(() => import("./pages/usuario/Dashboard"));
const Solicitar = lazy(() => import("./pages/usuario/Solicitar"));
const MinhasSolicitacoes = lazy(() => import("./pages/usuario/MinhasSolicitacoes"));
const Checkout = lazy(() => import("./pages/usuario/Checkout"));
const Checkin = lazy(() => import("./pages/usuario/Checkin"));
const DashboardConsulta = lazy(() => import("./pages/consulta/Dashboard"));
const Salas = lazy(() => import("./pages/salas/Salas"));
const VeiculoProprio = lazy(() => import("./pages/indenizacao/VeiculoProprio"));
const Indenizacoes = lazy(() => import("./pages/indenizacao/Indenizacoes"));
const GestorIndenizacoes = lazy(() => import("./pages/indenizacao/GestorIndenizacoes"));
const Equipamentos = lazy(() => import("./pages/equipamentos/Equipamentos"));

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
