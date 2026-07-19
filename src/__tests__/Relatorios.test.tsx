import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioGestor } from "../test/mocks/authContext";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  // Sidebar.tsx usa onSnapshot pro badge de pendentes (só perfil gestor); unsubscribe
  // no-op e sem chamar o callback é suficiente pra não quebrar o render das páginas.
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: { fromDate: (d: Date) => d, now: () => new Date() },
}));
vi.mock("../firebase/config", () => ({ db: {} }));
vi.mock("../contexts/AuthContext");

import { getDocs } from "firebase/firestore";
import Relatorios from "../pages/gestor/Relatorios";

function mkSnap(items: Array<{ id: string; data: Record<string, unknown> }>) {
  const docs = items.map(item => ({
    id: item.id,
    data: () => ({ ...item.data }),
    exists: () => true,
  }));
  return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn), size: docs.length };
}

const veiculos = [
  { id: "v-001", data: { placa: "ABC-1234", modelo: "Strada",  marca: "Fiat",    tipo: "caminhonete", status: "disponivel", kmAtual: 45000 } },
  { id: "v-002", data: { placa: "XYZ-5678", modelo: "Sandero", marca: "Renault", tipo: "carro",       status: "em_uso",     kmAtual: 32000 } },
];
const solicitacoes = [
  { id: "s-001", data: { status: "pendente" } },
  { id: "s-002", data: { status: "aprovada" } },
];
const usuarios = [
  { id: "u-001", data: { perfil: "usuario", ativo: true } },
  { id: "u-002", data: { perfil: "gestor",  ativo: true } },
];
const manutencoes = [
  { id: "m-001", data: { custo: 500 } },
];
const usos: Array<{ id: string; data: Record<string, unknown> }> = [];

function setupMocks() {
  vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
    makeAuthContext({ usuario: mockUsuarioGestor })
  );
  // Relatorios.tsx faz 5 chamadas getDocs em Promise.all, nesta ordem:
  // veiculos, solicitacoes, usuarios, manutencoes, usos
  vi.mocked(getDocs)
    .mockResolvedValueOnce(mkSnap(veiculos) as any)
    .mockResolvedValueOnce(mkSnap(solicitacoes) as any)
    .mockResolvedValueOnce(mkSnap(usuarios) as any)
    .mockResolvedValueOnce(mkSnap(manutencoes) as any)
    .mockResolvedValueOnce(mkSnap(usos) as any);
}

function renderRelatorios() {
  return render(<MemoryRouter><Relatorios /></MemoryRouter>);
}

function main() {
  return within(screen.getByRole("main"));
}

describe("Relatorios — renderização", () => {
  beforeEach(setupMocks);
  afterEach(() => vi.clearAllMocks());

  it("exibe o título Relatórios", async () => {
    renderRelatorios();
    expect(await main().findByText("Relatórios", { exact: true })).toBeInTheDocument();
  });

  it("exibe card de relatório Utilização da Frota", async () => {
    renderRelatorios();
    expect((await screen.findAllByText("Utilização da Frota"))[0]).toBeInTheDocument();
  });

  it("exibe card de relatório Solicitações", async () => {
    renderRelatorios();
    expect(await screen.findByText("Solicitações", { exact: true })).toBeInTheDocument();
  });

  it("exibe card Total de Veículos", async () => {
    renderRelatorios();
    expect(await screen.findByText("Total de Veículos")).toBeInTheDocument();
  });

  it("exibe card Disponíveis", async () => {
    renderRelatorios();
    expect((await screen.findAllByText("Disponíveis"))[0]).toBeInTheDocument();
  });

  it("exibe card Em Manutenção", async () => {
    renderRelatorios();
    expect(await screen.findByText("Em Manutenção")).toBeInTheDocument();
  });

  it("exibe card Disponibilidade", async () => {
    renderRelatorios();
    expect((await screen.findAllByText("Disponibilidade"))[0]).toBeInTheDocument();
  });

  it("exibe card Custo Manutenções", async () => {
    renderRelatorios();
    expect(await screen.findByText("Custo Manutenções")).toBeInTheDocument();
  });

  it("exibe card Usuários (ativos)", async () => {
    renderRelatorios();
    expect(await screen.findByText("ativos")).toBeInTheDocument();
  });
});

describe("Relatorios — exportação", () => {
  beforeEach(setupMocks);
  afterEach(() => vi.clearAllMocks());

  it("exibe botões de exportação CSV", async () => {
    renderRelatorios();
    expect(await screen.findByRole("button", { name: /csv viagens/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /csv agendamentos/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /csv manutenções/i })).toBeInTheDocument();
  });
});
