import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import type { Usuario } from "../types";

interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  ehGestor: boolean;
  ehUsuario: boolean;
  ehConsulta: boolean;
  ehAuditor: boolean;
  ehAdministrativo: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
          setUsuario({ uid: user.uid, email: user.email!, ...snap.data() } as Usuario);
        } else {
          // Sem doc em usuarios/{uid}: perfil menos privilegiado até um gestor provisionar a conta
          setUsuario({ uid: user.uid, email: user.email!, perfil: "consulta", nome: "", setor: "", ativo: false });
        }
      } else {
        setUsuario(null);
      }
      setCarregando(false);
    });
    return cancelar;
  }, []);

  async function login(email: string, senha: string) {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    const snap = await getDoc(doc(db, "usuarios", cred.user.uid));
    if (snap.exists()) {
      setUsuario({ uid: cred.user.uid, email: cred.user.email!, ...snap.data() } as Usuario);
    }
  }

  async function logout() {
    await signOut(auth);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, ehGestor: usuario?.perfil === "gestor", ehUsuario: usuario?.perfil === "usuario", ehConsulta: usuario?.perfil === "consulta", ehAuditor: usuario?.perfil === "auditor", ehAdministrativo: usuario?.perfil === "administrativo" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
