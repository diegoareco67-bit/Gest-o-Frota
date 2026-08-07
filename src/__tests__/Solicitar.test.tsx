import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioUsuario } from "../test/mocks/authContext";

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

import { getDocs, addDoc } from "firebase/firestore";
import Solicitar from "../pages/usuario/Solicitar";

function mkSnap(items: Array<{ id: string; data: Record<string, unknown> }>) {
  const docs = items.map(item => ({
    id: item.id,
    data: () => ({ ...item.data }),
    exists: () => true,
  }));
  return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn), size: docs.length };
}

const veiculosDisponiveis = [
  { id: "veiculo-001", data: { placa: "ABC-1234", modelo: "Strada", marca: "Fiat", tipo: "caminhonete", status: "disponivel" } },
];

function renderSolicitar() {
  return render(<MemoryRouter><Solicitar /></MemoryRouter>);
}

describe("Solicitar — renderização", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(veiculosDisponiveis) as any);
    vi.mocked(addDoc).mockResolvedValue({ id: "sol-novo" } as any);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe o título Nova Solicitação", async () => {
    renderSolicitar();
    expect(await within(screen.getByRole("main")).findByText("Nova Solicitação", { exact: true })).toBeInTheDocument();
  });

  it("exibe o select de veículo disponível", async () => {
    renderSolicitar();
    const label = await screen.findByText(/veículo disponível/i);
    expect(label).toBeInTheDocument();
  });

  it("exibe ABC-1234 no select de veículos", async () => {
    renderSolicitar();
    await within(screen.getByRole("main")).findByText("Nova Solicitação", { exact: true });
    const select = screen.getByRole("combobox");
    await waitFor(() => expect(select.textContent).toContain("ABC-1234"));
  });

  it("exibe campo de Destino", async () => {
    renderSolicitar();
    expect(await screen.findByPlaceholderText(/hospital cge-ms/i)).toBeInTheDocument();
  });

  it("exibe campo de Motivo", async () => {
    renderSolicitar();
    expect(await screen.findByPlaceholderText(/transporte de pacientes/i)).toBeInTheDocument();
  });

  it("exibe campos de Data/Hora de Saída e Retorno", async () => {
    renderSolicitar();
    await within(screen.getByRole("main")).findByText("Nova Solicitação", { exact: true });
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(dateInputs.length).toBe(2);
  });

  it("exibe botão Enviar Solicitação", async () => {
    renderSolicitar();
    expect(await screen.findByRole("button", { name: /enviar solicitação/i })).toBeInTheDocument();
  });

  it("exibe botão Cancelar", async () => {
    renderSolicitar();
    expect(await screen.findByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });
});

describe("Solicitar — sem veículos disponíveis", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap([]) as any);
  });

  afterEach(() => vi.clearAllMocks());

  it("exibe aviso quando não há veículos disponíveis", async () => {
    renderSolicitar();
    expect(await screen.findByText(/nenhum veículo disponível/i)).toBeInTheDocument();
  });
});

describe("Solicitar — envio do formulário", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioUsuario })
    );
    vi.mocked(getDocs).mockResolvedValue(mkSnap(veiculosDisponiveis) as any);
    vi.mocked(addDoc).mockResolvedValue({ id: "sol-novo" } as any);
  });

  afterEach(() => vi.clearAllMocks());

  it("enviar formulário completo chama addDoc e exibe confirmação", async () => {
    renderSolicitar();
    await within(screen.getByRole("main")).findByText("Nova Solicitação", { exact: true });

    await userEvent.selectOptions(screen.getByRole("combobox"), "veiculo-001");
    await userEvent.type(screen.getByPlaceholderText(/hospital cge-ms/i), "UPA Central");
    await userEvent.type(screen.getByPlaceholderText(/transporte de pacientes/i), "Exame médico");

    // Datas futuras: a validação de período rejeita início no passado.
    const emDias = (d: number, hora: string) => {
      const dt = new Date(Date.now() + d * 24 * 3600 * 1000);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${hora}`;
    };
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    await userEvent.type(dateInputs[0] as HTMLElement, emDias(2, "08:00"));
    await userEvent.type(dateInputs[1] as HTMLElement, emDias(2, "17:00"));

    await userEvent.click(screen.getByRole("button", { name: /enviar solicitação/i }));

    await waitFor(() => {
      expect(vi.mocked(addDoc)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "pendente", destino: "UPA Central" })
      );
    });

    expect(await screen.findByText(/solicitação enviada/i)).toBeInTheDocument();
  });
});
