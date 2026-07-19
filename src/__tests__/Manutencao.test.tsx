import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioGestor } from "../test/mocks/authContext";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(),
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
import Manutencao from "../pages/gestor/Manutencao";

function mkSnap(items: Array<{ id: string; data: Record<string, unknown> }>) {
  const docs = items.map(item => ({
    id: item.id,
    data: () => ({ ...item.data }),
    exists: () => true,
  }));
  return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn), size: docs.length };
}

const manutencoes = [
  { id: "man-001", data: { veiculoId: "veiculo-001", veiculoPlaca: "ABC-1234", tipo: "revisao", descricao: "Revisão periódica", status: "agendada",  previsao: "2025-02-10", custo: 500,  oficina: "Oficina Central" } },
  { id: "man-002", data: { veiculoId: "veiculo-002", veiculoPlaca: "XYZ-5678", tipo: "reparo",  descricao: "Troca de freios",    status: "concluida", previsao: "2025-01-15", custo: 1200, oficina: "Auto Mecânica Norte" } },
];

const veiculos = [
  { id: "veiculo-001", data: { placa: "ABC-1234", status: "manutencao" } },
  { id: "veiculo-002", data: { placa: "XYZ-5678", status: "em_uso" } },
];

function renderManutencao() {
  return render(<MemoryRouter><Manutencao /></MemoryRouter>);
}

describe("Manutencao — renderização", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mkSnap(manutencoes) as any)
      .mockResolvedValueOnce(mkSnap(veiculos) as any);
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe o título Manutenções", async () => {
    renderManutencao();
    expect(await within(screen.getByRole("main")).findByText("Manutenções", { exact: true })).toBeInTheDocument();
  });

  it("exibe botão Nova Manutenção", async () => {
    renderManutencao();
    expect(await screen.findByRole("button", { name: /nova manutenção/i })).toBeInTheDocument();
  });

  it("filtro de status tem a opção Agendada", async () => {
    renderManutencao();
    await screen.findByRole("combobox");
    expect(screen.getByRole("option", { name: "Agendada" })).toBeInTheDocument();
  });

  it("exibe a placa ABC-1234 na lista", async () => {
    renderManutencao();
    expect(await screen.findByText("ABC-1234")).toBeInTheDocument();
  });

  it("exibe a descrição da manutenção agendada", async () => {
    renderManutencao();
    expect(await screen.findByText(/Revisão preventiva|revisao/i)).toBeInTheDocument();
  });

  it("exibe botão Concluir para item agendado", async () => {
    renderManutencao();
    expect(await screen.findByRole("button", { name: /^concluir$/i })).toBeInTheDocument();
  });
});

describe("Manutencao — modal Agendar", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mkSnap(manutencoes) as any)
      .mockResolvedValueOnce(mkSnap(veiculos) as any);
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("clicar Nova Manutenção abre modal", async () => {
    renderManutencao();
    const btnNovo = await screen.findByRole("button", { name: /nova manutenção/i });
    await userEvent.click(btnNovo);
    expect(screen.getByRole("heading", { name: /nova manutenção/i })).toBeInTheDocument();
  });

  it("modal exibe campo de Descrição", async () => {
    renderManutencao();
    const btnNovo = await screen.findByRole("button", { name: /nova manutenção/i });
    await userEvent.click(btnNovo);
    expect(screen.getByRole("dialog").querySelector("textarea")).toBeInTheDocument();
  });

  it("modal exibe campo de Oficina", async () => {
    renderManutencao();
    const btnNovo = await screen.findByRole("button", { name: /nova manutenção/i });
    await userEvent.click(btnNovo);
    expect(screen.getByPlaceholderText(/oficina/i)).toBeInTheDocument();
  });

  it("botão Cancelar fecha o modal", async () => {
    renderManutencao();
    const btnNovo = await screen.findByRole("button", { name: /nova manutenção/i });
    await userEvent.click(btnNovo);

    const btnCancelar = screen.getByRole("button", { name: /^cancelar$/i });
    await userEvent.click(btnCancelar);

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /nova manutenção/i })).not.toBeInTheDocument();
    });
  });
});

describe("Manutencao — filtros", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mkSnap(manutencoes) as any)
      .mockResolvedValueOnce(mkSnap(veiculos) as any);
  });

  afterEach(() => vi.clearAllMocks());

  it("filtro Agendada mostra apenas man-001", async () => {
    renderManutencao();
    await screen.findByText("ABC-1234");
    await userEvent.selectOptions(screen.getByRole("combobox"), "agendada");

    expect(screen.getByText("ABC-1234")).toBeInTheDocument();
    expect(screen.queryByText("XYZ-5678")).not.toBeInTheDocument();
  });

  it("filtro Todas mostra ambas as manutenções", async () => {
    renderManutencao();
    await screen.findByText("ABC-1234");
    await userEvent.selectOptions(screen.getByRole("combobox"), "agendada");
    await userEvent.selectOptions(screen.getByRole("combobox"), "todas");

    expect(screen.getByText("ABC-1234")).toBeInTheDocument();
    expect(screen.getByText("XYZ-5678")).toBeInTheDocument();
  });
});
