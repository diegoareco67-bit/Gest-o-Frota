import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RotaProtegida } from "./components/layout/RotaProtegida";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Login from "./pages/Login";
import DashboardGestor from "./pages/gestor/Dashboard";
import Aprovacoes from "./pages/gestor/Aprovacoes";
import Veiculos from "./pages/gestor/Veiculos";
import Manutencao from "./pages/gestor/Manutencao";
import Relatorios from "./pages/gestor/Relatorios";
import Usuarios from "./pages/gestor/Usuarios";
import ManualUso from "./pages/gestor/ManualUso";
import DashboardUsuario from "./pages/usuario/Dashboard";
import Solicitar from "./pages/usuario/Solicitar";
import MinhasSolicitacoes from "./pages/usuario/MinhasSolicitacoes";
import Checkout from "./pages/usuario/Checkout";
import Checkin from "./pages/usuario/Checkin";
import DashboardConsulta from "./pages/consulta/Dashboard";
import Salas from "./pages/salas/Salas";
import VeiculoProprio from "./pages/indenizacao/VeiculoProprio";
import Indenizacoes from "./pages/indenizacao/Indenizacoes";
import GestorIndenizacoes from "./pages/indenizacao/GestorIndenizacoes";
import Equipamentos from "./pages/equipamentos/Equipamentos";
import Setores from "./pages/gestor/Setores";

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/gestor" element={<RotaProtegida perfil="gestor"><DashboardGestor /></RotaProtegida>} />
          <Route path="/gestor/aprovacoes" element={<RotaProtegida perfil="gestor"><Aprovacoes /></RotaProtegida>} />
          <Route path="/gestor/manual" element={<RotaProtegida perfil="gestor"><ManualUso /></RotaProtegida>} />
          <Route path="/gestor/veiculos" element={<RotaProtegida perfil="gestor"><Veiculos /></RotaProtegida>} />
          <Route path="/gestor/manutencao" element={<RotaProtegida perfil="gestor"><Manutencao /></RotaProtegida>} />
          <Route path="/gestor/usuarios" element={<RotaProtegida perfil="gestor"><Usuarios /></RotaProtegida>} />
          <Route path="/gestor/relatorios" element={<RotaProtegida perfil="gestor"><Relatorios /></RotaProtegida>} />
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
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
