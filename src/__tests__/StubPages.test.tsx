import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioUsuario } from "../test/mocks/authContext";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: { fromDate: (d: Date) => d, now: () => new Date() },
}));
vi.mock("../firebase/config", () => ({ db: {} }));
vi.mock("../contexts/AuthContext");

import { getDoc, getDocs } from "firebase/firestore";
import MinhasSolicitacoes from "../pages/usuario/MinhasSolicitacoes";
import Checkin from "../pages/usuario/Checkin";
import Checkout from "../pages/usuario/Checkout";

function mkSnap(items: Array<{ id: string; data: Record<string, unknown> }>) {
  const docs = items.map(item => ({ id: item.id, data: () => ({ ...item.data }), exists: () => true }));
  return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn), size: docs.length, empty: docs.length === 0 };
}

const solicitacao = {
  id: "sol-002", veiculoPlaca: "XYZ-5678", destino: "Secretaria de Educação",
  motivo: "Reunião", dataSaida: "2025-01-18T09:00", dataRetorno: "2025-01-18T12:00", status: "aprovada",
};

beforeEach(() => {
  vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
    makeAuthContext({ usuario: mockUsuarioUsuario })
  );
});

afterEach(() => vi.clearAllMocks());

describe("MinhasSolicitacoes", () => {
  it("renderiza a lista de solicitações do usuário", async () => {
    vi.mocked(getDocs).mockResolvedValue(mkSnap([{ id: "sol-002", data: solicitacao }]) as any);
    render(<MemoryRouter><MinhasSolicitacoes /></MemoryRouter>);
    expect(await within(screen.getByRole("main")).findByText("Minhas Solicitações", { exact: true })).toBeInTheDocument();
    expect(await screen.findByText(/Secretaria de Educação/)).toBeInTheDocument();
  });

  it("exibe mensagem de lista vazia quando não há solicitações", async () => {
    vi.mocked(getDocs).mockResolvedValue(mkSnap([]) as any);
    render(<MemoryRouter><MinhasSolicitacoes /></MemoryRouter>);
    expect(await screen.findByText(/você ainda não fez nenhuma solicitação/i)).toBeInTheDocument();
  });
});

describe("Checkout — Retirada do Veículo", () => {
  it("renderiza os dados da solicitação aprovada", async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, id: "sol-002", data: () => solicitacao } as any);
    render(
      <MemoryRouter initialEntries={["/usuario/checkout/sol-002"]}>
        <Routes><Route path="/usuario/checkout/:id" element={<Checkout />} /></Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText("Retirada do Veículo")).toBeInTheDocument();
    expect(await screen.findByText("Secretaria de Educação")).toBeInTheDocument();
  });
});

describe("Checkin — Devolução do Veículo", () => {
  it("renderiza os dados da solicitação em uso", async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, id: "sol-002", data: () => ({ ...solicitacao, status: "em_uso" }) } as any);
    vi.mocked(getDocs).mockResolvedValue(mkSnap([{ id: "uso-001", data: { solicitacaoId: "sol-002", kmSaida: 100, combustivelSaida: "cheio" } }]) as any);
    render(
      <MemoryRouter initialEntries={["/usuario/checkin/sol-002"]}>
        <Routes><Route path="/usuario/checkin/:id" element={<Checkin />} /></Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText("Devolução do Veículo")).toBeInTheDocument();
    expect(await screen.findByText("Secretaria de Educação")).toBeInTheDocument();
  });
});
