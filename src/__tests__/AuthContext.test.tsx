import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(() => ({})),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
}));
vi.mock("../firebase/config", () => ({ auth: {}, db: {} }));

import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function mkUserSnap(data: Record<string, unknown>) {
  return { exists: () => true, data: () => data, id: "uid-test" };
}

function ConsumoContexto() {
  const { usuario, carregando, ehGestor, ehUsuario, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="carregando">{String(carregando)}</span>
      <span data-testid="usuario">{usuario ? usuario.nome : "null"}</span>
      <span data-testid="perfil">{usuario?.perfil ?? "null"}</span>
      <span data-testid="gestor">{String(ehGestor)}</span>
      <span data-testid="eh-usuario">{String(ehUsuario)}</span>
      <button onClick={() => login("a@b.com", "senha")} data-testid="btn-login">Login</button>
      <button onClick={() => logout()} data-testid="btn-logout">Logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <ConsumoContexto />
    </AuthProvider>
  );
}

describe("AuthContext — estado inicial", () => {
  beforeEach(() => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      setTimeout(() => (cb as (u: null) => void)(null), 0);
      return () => {};
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("carregando começa true", () => {
    renderProvider();
    expect(screen.getByTestId("carregando").textContent).toBe("true");
  });

  it("usuario é null após onAuthStateChanged com null", async () => {
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId("carregando").textContent).toBe("false");
    });
    expect(screen.getByTestId("usuario").textContent).toBe("null");
  });

  it("ehGestor é false quando não há usuário", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("carregando").textContent).toBe("false"));
    expect(screen.getByTestId("gestor").textContent).toBe("false");
  });

  it("ehUsuario é false quando não há usuário", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("carregando").textContent).toBe("false"));
    expect(screen.getByTestId("eh-usuario").textContent).toBe("false");
  });
});

describe("AuthContext — onAuthStateChanged com usuário", () => {
  afterEach(() => vi.clearAllMocks());

  it("seta usuario gestor a partir do Firestore após onAuthStateChanged", async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      setTimeout(() => (cb as (u: object) => void)({ uid: "uid-gestor", email: "gestor@test.com" }), 0);
      return () => {};
    });
    vi.mocked(getDoc).mockResolvedValue(mkUserSnap({ nome: "Maria Gestora", perfil: "gestor", setor: "Gestão", matricula: "001", ativo: true }) as any);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("usuario").textContent).toBe("Maria Gestora");
    });
    expect(screen.getByTestId("perfil").textContent).toBe("gestor");
    expect(screen.getByTestId("gestor").textContent).toBe("true");
    expect(screen.getByTestId("eh-usuario").textContent).toBe("false");
  });

  it("seta usuario com perfil usuario", async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      setTimeout(() => (cb as (u: object) => void)({ uid: "uid-usuario", email: "usuario@test.com" }), 0);
      return () => {};
    });
    vi.mocked(getDoc).mockResolvedValue(mkUserSnap({ nome: "João Usuário", perfil: "usuario", setor: "TI", matricula: "12345", ativo: true }) as any);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("usuario").textContent).toBe("João Usuário");
    });
    expect(screen.getByTestId("gestor").textContent).toBe("false");
    expect(screen.getByTestId("eh-usuario").textContent).toBe("true");
  });

  it("usa fallback quando getDoc não encontra o documento", async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      setTimeout(() => (cb as (u: object) => void)({ uid: "uid-desconhecido", email: "novo@test.com" }), 0);
      return () => {};
    });
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false, data: () => ({}), id: "uid-desconhecido" } as any);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("carregando").textContent).toBe("false"));
    expect(screen.getByTestId("usuario").textContent).toBe("");
  });
});

describe("AuthContext — login", () => {
  beforeEach(() => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      setTimeout(() => (cb as (u: null) => void)(null), 0);
      return () => {};
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("login chama signInWithEmailAndPassword com email e senha", async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: { uid: "uid-test", email: "a@b.com" }
    } as any);
    vi.mocked(getDoc).mockResolvedValue(mkUserSnap({ nome: "Teste", perfil: "usuario", setor: "TI", matricula: "001", ativo: true }) as any);

    renderProvider();
    await waitFor(() => expect(screen.getByTestId("carregando").textContent).toBe("false"));

    await userEvent.click(screen.getByTestId("btn-login"));

    await waitFor(() => {
      expect(vi.mocked(signInWithEmailAndPassword)).toHaveBeenCalledWith(
        expect.anything(),
        "a@b.com",
        "senha"
      );
    });
  });
});

describe("AuthContext — logout", () => {
  beforeEach(() => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      setTimeout(() => (cb as (u: object) => void)({ uid: "uid-gestor", email: "gestor@test.com" }), 0);
      return () => {};
    });
    vi.mocked(getDoc).mockResolvedValue(mkUserSnap({ nome: "Maria", perfil: "gestor", setor: "Gestão", matricula: "001", ativo: true }) as any);
    vi.mocked(signOut).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("logout chama signOut", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("usuario").textContent).toBe("Maria"));

    await userEvent.click(screen.getByTestId("btn-logout"));

    await waitFor(() => {
      expect(vi.mocked(signOut)).toHaveBeenCalledOnce();
    });
  });

  it("logout limpa usuario no estado", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("usuario").textContent).toBe("Maria"));

    await act(async () => {
      await userEvent.click(screen.getByTestId("btn-logout"));
    });

    expect(screen.getByTestId("usuario").textContent).toBe("null");
  });
});

describe("AuthContext — useAuth fora do provider", () => {
  it("lança erro quando useAuth é usado fora de AuthProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ConsumoContexto />)).toThrow();
    consoleSpy.mockRestore();
  });
});
