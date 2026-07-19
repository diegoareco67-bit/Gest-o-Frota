import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioGestor, mockUsuarioUsuario } from "../test/mocks/authContext";

vi.mock("../contexts/AuthContext");

let pendentesSimulados = 0;
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  // Sidebar assina onSnapshot só quando perfil === "gestor"; simula a contagem
  // de pendentes sem fazer nenhuma chamada real ao Firestore.
  onSnapshot: vi.fn((_q: unknown, callback: (snap: { size: number }) => void) => {
    callback({ size: pendentesSimulados });
    return () => {};
  }),
}));
vi.mock("../firebase/config", () => ({ db: {} }));

import { Sidebar } from "../components/layout/Sidebar";

function renderSidebar(perfil: "gestor" | "usuario" | "consulta", pendentes = 0, path = "/gestor") {
  pendentesSimulados = pendentes;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar perfil={perfil} />
    </MemoryRouter>
  );
}

describe("Sidebar — gestor", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe logo FrotaGov", () => {
    renderSidebar("gestor");
    expect(screen.getByText("FrotaGov")).toBeInTheDocument();
  });

  it("exibe item Dashboard", () => {
    renderSidebar("gestor");
    expect(screen.getByRole("button", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("exibe item Aprovações", () => {
    renderSidebar("gestor");
    expect(screen.getByRole("button", { name: /aprovações/i })).toBeInTheDocument();
  });

  it("exibe item Veículos", () => {
    renderSidebar("gestor");
    expect(screen.getByRole("button", { name: /veículos/i })).toBeInTheDocument();
  });

  it("exibe item Manutenção", () => {
    renderSidebar("gestor");
    expect(screen.getByRole("button", { name: /manutenção/i })).toBeInTheDocument();
  });

  it("exibe item Usuários", () => {
    renderSidebar("gestor");
    expect(screen.getByRole("button", { name: /usuários/i })).toBeInTheDocument();
  });

  it("exibe item Relatórios", () => {
    renderSidebar("gestor");
    expect(screen.getByRole("button", { name: /relatórios/i })).toBeInTheDocument();
  });

  it("não exibe itens exclusivos de usuário", () => {
    renderSidebar("gestor");
    expect(screen.queryByRole("button", { name: /minhas solicitações/i })).not.toBeInTheDocument();
  });

  it("exibe badge de pendentes quando pendentes > 0", () => {
    renderSidebar("gestor", 3);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("não exibe badge quando pendentes é 0", () => {
    renderSidebar("gestor", 0);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("exibe iniciais do usuário no avatar", () => {
    renderSidebar("gestor");
    expect(screen.getByText("MG")).toBeInTheDocument();
  });

  it("exibe o primeiro nome do usuário", () => {
    renderSidebar("gestor");
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("exibe role Gestor · CGE-MS", () => {
    renderSidebar("gestor");
    expect(screen.getByText(/gestor · cge-ms/i)).toBeInTheDocument();
  });

  it("botão Sair chama logout", async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor, logout: mockLogout })
    );
    renderSidebar("gestor");
    await userEvent.click(screen.getByTitle("Sair do sistema"));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});

describe("Sidebar — usuario", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario })
    );
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe item Início", () => {
    renderSidebar("usuario", 0, "/usuario");
    expect(screen.getByRole("button", { name: /início/i })).toBeInTheDocument();
  });

  it("exibe item Nova Solicitação", () => {
    renderSidebar("usuario", 0, "/usuario");
    expect(screen.getByRole("button", { name: /nova solicitação/i })).toBeInTheDocument();
  });

  it("exibe item Minhas Solicitações", () => {
    renderSidebar("usuario", 0, "/usuario");
    expect(screen.getByRole("button", { name: /minhas solicitações/i })).toBeInTheDocument();
  });

  it("não exibe itens exclusivos de gestor", () => {
    renderSidebar("usuario", 0, "/usuario");
    expect(screen.queryByRole("button", { name: /aprovações/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /relatórios/i })).not.toBeInTheDocument();
  });

  it("exibe iniciais do usuário", () => {
    renderSidebar("usuario", 0, "/usuario");
    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it("exibe role Usuário · CGE-MS", () => {
    renderSidebar("usuario", 0, "/usuario");
    expect(screen.getByText(/usuário · cge-ms/i)).toBeInTheDocument();
  });
});

describe("Sidebar — sem usuário", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: null })
    );
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe ?? nas iniciais quando não há usuário", () => {
    renderSidebar("gestor");
    expect(screen.getByText("??")).toBeInTheDocument();
  });

  it("exibe Usuário como nome quando não há usuário", () => {
    renderSidebar("gestor");
    expect(screen.getByText("Usuário")).toBeInTheDocument();
  });
});
