import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioUsuario } from "../test/mocks/authContext";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
}));
vi.mock("../firebase/config", () => ({ db: {} }));
vi.mock("../contexts/AuthContext");

import { getDocs } from "firebase/firestore";
import DashboardUsuario from "../pages/usuario/Dashboard";

function mkSnap(items: Array<{ id: string; data: Record<string, unknown> }>) {
  const docs = items.map(item => ({
    id: item.id,
    data: () => ({ ...item.data }),
    exists: () => true,
  }));
  return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn), size: docs.length };
}

const solicitacoes = [
  { id: "sol-001", data: { protocolo: "SOL001", veiculoPlaca: "ABC-1234", destino: "Hospital Municipal", status: "pendente",  dataSaida: "2025-01-20T08:00", dataRetorno: "2025-01-20T17:00", condutorId: "usuario-uid-123" } },
  { id: "sol-002", data: { protocolo: "SOL002", veiculoPlaca: "XYZ-5678", destino: "Secretaria de Saúde", status: "aprovada",  dataSaida: "2025-01-18T09:00", dataRetorno: "2025-01-18T12:00", condutorId: "usuario-uid-123" } },
  { id: "sol-003", data: { protocolo: "SOL003", veiculoPlaca: "DEF-9999", destino: "Câmara Municipal",   status: "concluida", dataSaida: "2025-01-15T08:00", dataRetorno: "2025-01-15T17:00", condutorId: "usuario-uid-123" } },
];

function renderDashboard() {
  return render(<MemoryRouter><DashboardUsuario /></MemoryRouter>);
}

describe("DashboardUsuario — renderização", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(solicitacoes) as any);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe saudação com primeiro nome do usuário", async () => {
    renderDashboard();
    expect((await screen.findAllByText(/joão/i))[0]).toBeInTheDocument();
  });

  it("exibe card Pendentes", async () => {
    renderDashboard();
    expect(await screen.findByText("Pendentes")).toBeInTheDocument();
  });

  it("exibe card Aprovadas", async () => {
    renderDashboard();
    expect(await screen.findByText("Aprovadas")).toBeInTheDocument();
  });

  it("exibe card Em Uso", async () => {
    renderDashboard();
    expect(await screen.findByText("Em Uso")).toBeInTheDocument();
  });

  it("exibe card Concluídas", async () => {
    renderDashboard();
    expect(await screen.findByText("Concluídas")).toBeInTheDocument();
  });

  it("exibe seção Solicitações Recentes", async () => {
    renderDashboard();
    expect(await screen.findByText("Solicitações Recentes")).toBeInTheDocument();
  });

  it("exibe seção Ações Rápidas", async () => {
    renderDashboard();
    expect(await screen.findByText("Ações Rápidas")).toBeInTheDocument();
  });

  it("exibe destino Hospital Municipal nas solicitações recentes", async () => {
    renderDashboard();
    expect(await screen.findByText("Hospital Municipal")).toBeInTheDocument();
  });

  it("exibe botão Nova Solicitação", async () => {
    renderDashboard();
    const btns = await screen.findAllByRole("button", { name: /nova solicitação/i });
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it("exibe botão Ver todas", async () => {
    renderDashboard();
    expect(await screen.findByRole("button", { name: /ver todas/i })).toBeInTheDocument();
  });
});

describe("DashboardUsuario — sem solicitações", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap([]) as any);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe estado vazio quando não há solicitações", async () => {
    renderDashboard();
    expect(await screen.findByText(/nenhuma solicitação ainda/i)).toBeInTheDocument();
  });

  it("cards mostram valor zero", async () => {
    renderDashboard();
    await screen.findByText("Pendentes");
    const valores = screen.getAllByText("0");
    expect(valores.length).toBeGreaterThanOrEqual(4);
  });
});

describe("DashboardUsuario — contadores", () => {
  afterEach(() => vi.clearAllMocks());

  it("conta corretamente: exibe múltiplos cards com valor 1", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(solicitacoes) as any);

    renderDashboard();
    await screen.findByText("Pendentes");

    // Pendentes = 1, Aprovadas = 1, Em Uso = 0, Concluídas = 1
    const valores = screen.getAllByText("1");
    expect(valores.length).toBeGreaterThanOrEqual(3);
  });
});

describe("DashboardUsuario — ação botão aprovada", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(solicitacoes) as any);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe botão Iniciar Uso para solicitação aprovada", async () => {
    renderDashboard();
    expect(await screen.findByRole("button", { name: /iniciar uso do veículo/i })).toBeInTheDocument();
  });
});
