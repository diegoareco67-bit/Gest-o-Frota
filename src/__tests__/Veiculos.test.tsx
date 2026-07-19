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
vi.mock("../firebase/config", () => ({ db: {} }));
vi.mock("../contexts/AuthContext");

import { getDocs, addDoc, updateDoc } from "firebase/firestore";
import Veiculos from "../pages/gestor/Veiculos";

function mkSnap(items: Array<{ id: string; data: Record<string, unknown> }>) {
  const docs = items.map(item => ({
    id: item.id,
    data: () => ({ ...item.data }),
    exists: () => true,
  }));
  return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn), size: docs.length };
}

const veiculos = [
  { id: "veiculo-001", data: { placa: "ABC-1234", modelo: "Strada",  marca: "Fiat",    ano: 2022, tipo: "caminhonete", cor: "Branco", status: "disponivel", kmAtual: 45000 } },
  { id: "veiculo-002", data: { placa: "XYZ-5678", modelo: "Sandero", marca: "Renault", ano: 2021, tipo: "carro",       cor: "Prata",  status: "em_uso",     kmAtual: 32000 } },
];

function renderVeiculos() {
  return render(<MemoryRouter><Veiculos /></MemoryRouter>);
}

describe("Veiculos — renderização", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(veiculos) as any);
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe o título Veículos", async () => {
    renderVeiculos();
    expect(await within(screen.getByRole("main")).findByText("Veículos", { exact: true })).toBeInTheDocument();
  });

  it("exibe a placa ABC-1234 na lista", async () => {
    renderVeiculos();
    expect(await screen.findByText("ABC-1234")).toBeInTheDocument();
  });

  it("exibe a placa XYZ-5678 na lista", async () => {
    renderVeiculos();
    expect(await screen.findByText("XYZ-5678")).toBeInTheDocument();
  });

  it("exibe status Disponível para ABC-1234", async () => {
    renderVeiculos();
    await screen.findByText("ABC-1234");
    expect(within(screen.getByRole("table")).getByText("Disponível")).toBeInTheDocument();
  });

  it("exibe status Em Uso para XYZ-5678", async () => {
    renderVeiculos();
    await screen.findByText("XYZ-5678");
    expect(within(screen.getByRole("table")).getByText("Em Uso")).toBeInTheDocument();
  });

  it("exibe botão Novo Veículo", async () => {
    renderVeiculos();
    expect(await screen.findByRole("button", { name: /novo veículo/i })).toBeInTheDocument();
  });

  it("exibe botões Editar para cada veículo", async () => {
    renderVeiculos();
    const btns = await screen.findAllByRole("button", { name: /editar/i });
    expect(btns.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Veiculos — modal Novo Veículo", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(veiculos) as any);
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as any);
  });

  afterEach(() => vi.clearAllMocks());

  it("clicar Novo Veículo abre modal", async () => {
    renderVeiculos();
    const btnNovo = await screen.findByRole("button", { name: /novo veículo/i });
    await userEvent.click(btnNovo);
    expect(screen.getByPlaceholderText("HTO-3017")).toBeInTheDocument();
  });

  it("modal exibe campo de Placa com placeholder correto", async () => {
    renderVeiculos();
    const btnNovo = await screen.findByRole("button", { name: /novo veículo/i });
    await userEvent.click(btnNovo);
    expect(screen.getByPlaceholderText("HTO-3017")).toBeInTheDocument();
  });

  it("modal exibe campo de Marca", async () => {
    renderVeiculos();
    const btnNovo = await screen.findByRole("button", { name: /novo veículo/i });
    await userEvent.click(btnNovo);
    expect(screen.getByPlaceholderText("Toyota")).toBeInTheDocument();
  });

  it("botão Cancelar fecha o modal", async () => {
    renderVeiculos();
    const btnNovo = await screen.findByRole("button", { name: /novo veículo/i });
    await userEvent.click(btnNovo);

    const btnCancelar = screen.getByRole("button", { name: /cancelar/i });
    await userEvent.click(btnCancelar);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("HTO-3017")).not.toBeInTheDocument();
    });
  });
});

describe("Veiculos — modal Editar Veículo", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(veiculos) as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("clicar Editar abre modal com dados do veículo", async () => {
    renderVeiculos();
    const btns = await screen.findAllByRole("button", { name: /editar/i });
    await userEvent.click(btns[0]);

    expect(screen.getByText("Editar Veículo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ABC-1234")).toBeInTheDocument();
  });
});
