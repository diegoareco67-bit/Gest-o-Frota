import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioGestor } from "../test/mocks/authContext";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: { fromDate: (d: Date) => d, now: () => new Date() },
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => () => {}),
}));
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  getAuth: vi.fn(() => ({})),
}));
vi.mock("../firebase/config", () => ({ db: {}, auth: {} }));
// Criação de conta é feita por um helper (instância secundária, não desloga o gestor).
vi.mock("../firebase/criarConta", () => ({ criarContaSemTrocarSessao: vi.fn() }));
vi.mock("../contexts/AuthContext");
// useSetores tem sua própria chamada getDocs assíncrona (coleção "setores");
// mockada diretamente para não depender da ordem de resolução dos getDocs deste teste.
vi.mock("../hooks/useSetores", () => ({
  useSetores: () => [
    { id: "setor-001", nome: "TI", ativo: true },
    { id: "setor-002", nome: "Secretaria de Obras", ativo: true },
  ],
}));

import { getDocs, setDoc, updateDoc } from "firebase/firestore";
import { criarContaSemTrocarSessao } from "../firebase/criarConta";
import Usuarios from "../pages/gestor/Usuarios";

function mkSnap(items: Array<{ id: string; data: Record<string, unknown> }>) {
  const docs = items.map(item => ({
    id: item.id,
    data: () => ({ ...item.data }),
    exists: () => true,
  }));
  return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn), size: docs.length };
}

const usuarios = [
  { id: "uid-usuario-teste", data: { nome: "João Usuário", email: "joao@cge.ms.gov.br", perfil: "usuario", setor: "TI", matricula: "12345", ativo: true } },
];
const solicitacoesAcesso: Array<{ id: string; data: Record<string, unknown> }> = [];

function renderUsuarios() {
  return render(<MemoryRouter><Usuarios /></MemoryRouter>);
}

describe("Usuarios — renderização", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    // Usuarios.tsx faz 2 getDocs em Promise.all: usuarios, solicitacoesAcesso
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mkSnap(usuarios) as any)
      .mockResolvedValueOnce(mkSnap(solicitacoesAcesso) as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe o título Usuários", async () => {
    renderUsuarios();
    expect(await within(screen.getByRole("main")).findByText("Usuários", { exact: true })).toBeInTheDocument();
  });

  it("exibe botão Novo Usuário", async () => {
    renderUsuarios();
    expect(await screen.findByRole("button", { name: /novo usuário/i })).toBeInTheDocument();
  });

  it("exibe João Usuário na lista", async () => {
    renderUsuarios();
    expect(await screen.findByText("João Usuário")).toBeInTheDocument();
  });

  it("exibe badge Ativo para usuário ativo", async () => {
    renderUsuarios();
    expect(await screen.findByText("Ativo")).toBeInTheDocument();
  });

  it("exibe botão Desativar para usuário ativo", async () => {
    renderUsuarios();
    expect(await screen.findByRole("button", { name: /desativar/i })).toBeInTheDocument();
  });

  it("exibe setor do usuário", async () => {
    renderUsuarios();
    expect(await screen.findByText(/TI/)).toBeInTheDocument();
  });
});

describe("Usuarios — modal Novo Usuário", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs)
      .mockResolvedValue(mkSnap(usuarios) as any);
    vi.mocked(criarContaSemTrocarSessao).mockResolvedValue("new-uid");
    vi.mocked(setDoc).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("clicar Novo Usuário abre modal", async () => {
    renderUsuarios();
    const btnNovo = await screen.findByRole("button", { name: /novo usuário/i });
    await userEvent.click(btnNovo);
    expect(screen.getByText("Novo Usuário")).toBeInTheDocument();
  });

  it("modal exibe campo Nome completo", async () => {
    renderUsuarios();
    const btnNovo = await screen.findByRole("button", { name: /novo usuário/i });
    await userEvent.click(btnNovo);
    expect(screen.getByPlaceholderText("João da Silva")).toBeInTheDocument();
  });

  it("modal exibe campo E-mail", async () => {
    renderUsuarios();
    const btnNovo = await screen.findByRole("button", { name: /novo usuário/i });
    await userEvent.click(btnNovo);
    expect(screen.getByPlaceholderText("joao@cge.ms.gov.br")).toBeInTheDocument();
  });

  it("modal exibe campo Setor", async () => {
    renderUsuarios();
    const btnNovo = await screen.findByRole("button", { name: /novo usuário/i });
    await userEvent.click(btnNovo);
    expect(within(screen.getByRole("dialog")).getAllByRole("combobox")[0]).toBeInTheDocument();
  });

  it("botão Cancelar fecha o modal", async () => {
    renderUsuarios();
    const btnNovo = await screen.findByRole("button", { name: /novo usuário/i });
    await userEvent.click(btnNovo);

    const btnCancelar = screen.getByRole("button", { name: /cancelar/i });
    await userEvent.click(btnCancelar);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("João da Silva")).not.toBeInTheDocument();
    });
  });

  it("preencher e cadastrar cria a conta sem trocar a sessão do gestor", async () => {
    renderUsuarios();
    const btnNovo = await screen.findByRole("button", { name: /novo usuário/i });
    await userEvent.click(btnNovo);

    await userEvent.type(screen.getByPlaceholderText("João da Silva"), "Pedro Novo");
    await userEvent.type(screen.getByPlaceholderText("joao@cge.ms.gov.br"), "pedro@cge.ms.gov.br");
    await userEvent.selectOptions(
      within(screen.getByRole("dialog")).getAllByRole("combobox")[0],
      "Secretaria de Obras"
    );

    await userEvent.click(screen.getByRole("button", { name: /^cadastrar$/i }));

    await waitFor(() => {
      expect(vi.mocked(criarContaSemTrocarSessao)).toHaveBeenCalledWith(
        "pedro@cge.ms.gov.br",
        expect.any(String)
      );
    });
  });
});
