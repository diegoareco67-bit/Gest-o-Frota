import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioGestor } from "../test/mocks/authContext";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: "audit-id" }),
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

import { getDocs, updateDoc } from "firebase/firestore";
import Aprovacoes from "../pages/gestor/Aprovacoes";

function mkSnap(items: Array<{ id: string; data: Record<string, unknown> }>) {
  const docs = items.map(item => ({
    id: item.id,
    data: () => ({ ...item.data }),
    exists: () => true,
  }));
  return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn), size: docs.length };
}

const solicitacoes = [
  { id: "sol-001", data: { protocolo: "SOL001", condutorNome: "João Condutor", veiculoPlaca: "ABC-1234", destino: "Hospital Municipal", motivo: "Transporte", dataSaida: "2025-01-20T08:00", dataRetorno: "2025-01-20T17:00", status: "pendente" } },
  { id: "sol-002", data: { protocolo: "SOL002", condutorNome: "Maria Silva",    veiculoPlaca: "XYZ-5678", destino: "Secretaria de Educação", motivo: "Reunião", dataSaida: "2025-01-18T09:00", dataRetorno: "2025-01-18T12:00", status: "aprovada" } },
];

function renderAprovacoes() {
  return render(<MemoryRouter><Aprovacoes /></MemoryRouter>);
}

describe("Aprovacoes — renderização", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(solicitacoes) as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe o título Aprovações", async () => {
    renderAprovacoes();
    expect(await within(screen.getByRole("main")).findByText("Aprovações", { exact: true })).toBeInTheDocument();
  });

  it("exibe filtro Pendentes com contagem", async () => {
    renderAprovacoes();
    expect(await screen.findByRole("button", { name: /pendentes\s*1/i })).toBeInTheDocument();
  });

  it("exibe filtro Aprovadas", async () => {
    renderAprovacoes();
    expect(await screen.findByRole("button", { name: /aprovadas\s*1/i })).toBeInTheDocument();
  });

  it("exibe João Condutor na lista de pendentes", async () => {
    renderAprovacoes();
    expect(await screen.findByText(/João Condutor/)).toBeInTheDocument();
  });

  it("exibe a placa ABC-1234", async () => {
    renderAprovacoes();
    expect(await screen.findByText(/ABC-1234/)).toBeInTheDocument();
  });

  it("exibe o destino Hospital Municipal", async () => {
    renderAprovacoes();
    expect(await screen.findByText(/Hospital Municipal/)).toBeInTheDocument();
  });

  it("exibe botão Aprovar", async () => {
    renderAprovacoes();
    expect(await screen.findByRole("button", { name: /aprovar/i })).toBeInTheDocument();
  });

  it("exibe botão Recusar", async () => {
    renderAprovacoes();
    expect(await screen.findByRole("button", { name: /recusar/i })).toBeInTheDocument();
  });
});

describe("Aprovacoes — interação de recusa", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(solicitacoes) as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it("clicar Recusar exibe campo de motivo", async () => {
    renderAprovacoes();
    const btnRecusar = await screen.findByRole("button", { name: /recusar/i });
    await userEvent.click(btnRecusar);
    expect(screen.getByPlaceholderText(/motivo da recusa/i)).toBeInTheDocument();
  });

  it("clicar Cancelar após Recusar restaura botões Aprovar e Recusar", async () => {
    renderAprovacoes();
    const btnRecusar = await screen.findByRole("button", { name: /recusar/i });
    await userEvent.click(btnRecusar);

    const btnCancelar = screen.getByRole("button", { name: /cancelar/i });
    await userEvent.click(btnCancelar);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /aprovar/i })).toBeInTheDocument();
    });
  });

  it("clicar Aprovar chama updateDoc com status aprovada", async () => {
    renderAprovacoes();
    const btnAprovar = await screen.findByRole("button", { name: /aprovar/i });
    await userEvent.click(btnAprovar);

    await waitFor(() => {
      expect(vi.mocked(updateDoc)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "aprovada" })
      );
    });
  });
});
