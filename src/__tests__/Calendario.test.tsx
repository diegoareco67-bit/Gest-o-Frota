import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import * as AuthContextModule from "../contexts/AuthContext";
import { makeAuthContext, mockUsuarioGestor } from "../test/mocks/authContext";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  getDocs: vi.fn().mockResolvedValue({ docs: [], forEach: () => {}, size: 0, empty: true }),
  updateDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
}));
vi.mock("../firebase/config", () => ({ db: {} }));
vi.mock("../contexts/AuthContext");

import Calendario from "../components/Calendario";

describe("Calendario — renderização", () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(
      makeAuthContext({ usuario: mockUsuarioGestor, ehGestor: true })
    );
  });

  it("exibe o número do dia atual", () => {
    render(<Calendario />);
    const dia = new Date().getDate().toString();
    expect(screen.getByText(dia)).toBeInTheDocument();
  });

  it("exibe o mês atual em português", () => {
    render(<Calendario />);
    const mes = new Date().toLocaleString("pt-BR", { month: "long" });
    expect(screen.getByText(new RegExp(mes, "i"))).toBeInTheDocument();
  });

  it("exibe o ano atual", () => {
    render(<Calendario />);
    const ano = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(ano))).toBeInTheDocument();
  });
});
