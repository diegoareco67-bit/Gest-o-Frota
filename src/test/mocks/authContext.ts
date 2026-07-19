import type { Usuario } from "../../types";

export const mockUsuarioUsuario: Usuario = {
  uid: "usuario-uid-123",
  nome: "João Silva",
  email: "joao.silva@cge.ms.gov.br",
  perfil: "usuario",
  setor: "TI",
  matricula: "12345",
  ativo: true,
};

export const mockUsuarioGestor: Usuario = {
  uid: "gestor-uid-456",
  nome: "Maria Gestora",
  email: "maria.gestora@cge.ms.gov.br",
  perfil: "gestor",
  setor: "Gestão",
  matricula: "67890",
  ativo: true,
};

export function makeAuthContext(overrides: {
  usuario?: Usuario | null;
  carregando?: boolean;
  ehGestor?: boolean;
  ehUsuario?: boolean;
  ehConsulta?: boolean;
  ehAuditor?: boolean;
}) {
  return {
    usuario: null,
    carregando: false,
    ehGestor: false,
    ehUsuario: false,
    ehConsulta: false,
    ehAuditor: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}
