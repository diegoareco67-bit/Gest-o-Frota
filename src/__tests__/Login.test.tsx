import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Login from "../pages/Login";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext } from "../test/mocks/authContext";

vi.mock("../contexts/AuthContext");

function renderLogin() {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe("Login — renderização", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: null })
    );
  });

  it("exibe o título FrotaGov", () => {
    renderLogin();
    expect(screen.getByText("FrotaGov")).toBeInTheDocument();
  });

  it("exibe o campo de e-mail institucional", () => {
    renderLogin();
    expect(screen.getByLabelText("E-mail institucional")).toBeInTheDocument();
  });

  it("exibe o campo de senha", () => {
    renderLogin();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });

  it("exibe o botão de entrar", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /entrar no sistema/i })).toBeInTheDocument();
  });

  it("exibe o link para solicitar cadastro", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /solicitar cadastro/i })).toBeInTheDocument();
  });
});

describe("Login — interação de senha", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: null })
    );
  });

  it("o campo de senha começa como tipo password", () => {
    renderLogin();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
  });

  it("alterna visibilidade da senha ao clicar no botão olho", async () => {
    renderLogin();
    const senhaInput = screen.getByLabelText("Senha");
    const eyeBtn = screen.getByRole("button", { name: /exibir senha|ocultar senha/i });

    expect(senhaInput).toHaveAttribute("type", "password");
    await userEvent.click(eyeBtn);
    expect(senhaInput).toHaveAttribute("type", "text");
    await userEvent.click(eyeBtn);
    expect(senhaInput).toHaveAttribute("type", "password");
  });
});

describe("Login — submissão do formulário", () => {
  it("chama login com e-mail e senha corretos", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: null, login: mockLogin })
    );

    renderLogin();

    await userEvent.type(screen.getByLabelText("E-mail institucional"), "joao@cge.ms.gov.br");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    fireEvent.submit(screen.getByRole("button", { name: /entrar no sistema/i }).closest("form")!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("joao@cge.ms.gov.br", "senha123");
    });
  });

  it("exibe mensagem de erro quando login falha", async () => {
    const erro = Object.assign(new Error("Firebase: Error (auth/invalid-credential)."), { code: "auth/invalid-credential" });
    const mockLogin = vi.fn().mockRejectedValue(erro);
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: null, login: mockLogin })
    );

    renderLogin();

    await userEvent.type(screen.getByLabelText("E-mail institucional"), "errado@cge.ms.gov.br");
    await userEvent.type(screen.getByLabelText("Senha"), "senhaerrada");
    fireEvent.submit(screen.getByRole("button", { name: /entrar no sistema/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/e-mail ou senha incorretos/i)).toBeInTheDocument();
    });
  });

  it("desabilita o botão durante o carregamento", async () => {
    const mockLogin = vi.fn(() => new Promise(() => {})); // nunca resolve
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: null, login: mockLogin })
    );

    renderLogin();
    const btn = screen.getByRole("button", { name: /entrar no sistema/i });

    await userEvent.type(screen.getByLabelText("E-mail institucional"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Senha"), "abc123");
    fireEvent.submit(btn.closest("form")!);

    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
  });

  it("limpa o erro ao digitar no campo de e-mail", async () => {
    const erro = Object.assign(new Error("Firebase: Error (auth/invalid-credential)."), { code: "auth/invalid-credential" });
    const mockLogin = vi.fn().mockRejectedValue(erro);
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: null, login: mockLogin })
    );

    renderLogin();
    const emailInput = screen.getByLabelText("E-mail institucional");

    await userEvent.type(emailInput, "x@y.com");
    await userEvent.type(screen.getByLabelText("Senha"), "wrong");
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/e-mail ou senha incorretos/i)).toBeInTheDocument();
    });

    await userEvent.type(emailInput, "a");
    expect(screen.queryByText(/e-mail ou senha incorretos/i)).not.toBeInTheDocument();
  });
});
