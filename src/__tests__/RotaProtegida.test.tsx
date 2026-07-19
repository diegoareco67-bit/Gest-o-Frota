import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { RotaProtegida } from "../components/layout/RotaProtegida";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioUsuario, mockUsuarioGestor } from "../test/mocks/authContext";

vi.mock("../contexts/AuthContext");

function renderRota(perfil?: "gestor" | "usuario") {
  render(
    <MemoryRouter initialEntries={["/protegida"]}>
      <Routes>
        <Route
          path="/protegida"
          element={
            <RotaProtegida perfil={perfil}>
              <div>Conteúdo protegido</div>
            </RotaProtegida>
          }
        />
        <Route path="/login" element={<div>Página de login</div>} />
        <Route path="/gestor" element={<div>Dashboard gestor</div>} />
        <Route path="/usuario" element={<div>Dashboard usuario</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RotaProtegida — estado de carregamento", () => {
  it("exibe mensagem de carregando enquanto autenticação está pendente", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ carregando: true, usuario: null })
    );
    renderRota();
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });
});

describe("RotaProtegida — usuário não autenticado", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: null, carregando: false })
    );
  });

  it("redireciona para /login quando não há usuário", () => {
    renderRota();
    expect(screen.getByText("Página de login")).toBeInTheDocument();
  });

  it("não exibe o conteúdo protegido", () => {
    renderRota();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });
});

describe("RotaProtegida — usuário autenticado sem restrição de perfil", () => {
  it("exibe o conteúdo para usuario sem perfil exigido", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario, carregando: false })
    );
    renderRota();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("exibe o conteúdo para gestor sem perfil exigido", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor, carregando: false })
    );
    renderRota();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });
});

describe("RotaProtegida — controle de perfil", () => {
  it("exibe conteúdo quando usuario acessa rota de usuario", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario, carregando: false })
    );
    renderRota("usuario");
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("exibe conteúdo quando gestor acessa rota de gestor", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor, carregando: false })
    );
    renderRota("gestor");
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("redireciona usuario que tenta acessar rota de gestor", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario, carregando: false })
    );
    renderRota("gestor");
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard usuario")).toBeInTheDocument();
  });

  it("redireciona gestor que tenta acessar rota de usuario", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor, carregando: false })
    );
    renderRota("usuario");
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard gestor")).toBeInTheDocument();
  });
});
