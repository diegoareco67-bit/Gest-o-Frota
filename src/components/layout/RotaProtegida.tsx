import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import type { Perfil } from "../../types";

export function RotaProtegida({ children, perfil }: { children: ReactNode; perfil?: Perfil | Perfil[] }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"#888" }}>Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  const permitidos = perfil === undefined ? null : Array.isArray(perfil) ? perfil : [perfil];
  if (permitidos && !permitidos.includes(usuario.perfil)) return <Navigate to={`/${usuario.perfil}`} replace />;
  return <>{children}</>;
}
