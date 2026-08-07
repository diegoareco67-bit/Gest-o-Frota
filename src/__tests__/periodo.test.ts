import { describe, it, expect } from "vitest";
import { validarPeriodo, formatarDuracao, formatarDataHoraBR, MAX_DIAS_RESERVA } from "../utils/periodo";

/** Monta uma data ISO local deslocada em horas a partir de agora. */
function daqui(horas: number): string {
  const d = new Date(Date.now() + horas * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

describe("validarPeriodo — limite de duração", () => {
  it("aceita um período curto e válido", () => {
    expect(validarPeriodo(daqui(1), daqui(3))).toBeNull();
  });

  it("aceita exatamente no limite de dias", () => {
    expect(validarPeriodo(daqui(1), daqui(1 + MAX_DIAS_RESERVA * 24 - 1))).toBeNull();
  });

  it("BLOQUEIA período acima do limite (o bug reportado: reserva de ~100 anos)", () => {
    const erro = validarPeriodo(daqui(1), "2126-08-07T14:00");
    expect(erro).toBeTruthy();
    expect(erro).toMatch(/não pode passar de 7 dias/i);
  });

  it("bloqueia 8 dias, logo acima do limite de 7", () => {
    const erro = validarPeriodo(daqui(1), daqui(1 + 8 * 24));
    expect(erro).toMatch(/não pode passar de 7 dias/i);
  });

  it("informa a duração real na mensagem de erro", () => {
    const erro = validarPeriodo(daqui(1), daqui(1 + 10 * 24));
    expect(erro).toMatch(/10 dias/);
  });

  it("respeita maxDias customizado (salas e equipamentos usam 1 dia)", () => {
    expect(validarPeriodo(daqui(1), daqui(3), { maxDias: 1 })).toBeNull();
    expect(validarPeriodo(daqui(1), daqui(30), { maxDias: 1 })).toMatch(/não pode passar de 1 dia/i);
  });
});

describe("validarPeriodo — ordem e obrigatoriedade", () => {
  it("exige os dois campos", () => {
    expect(validarPeriodo("", daqui(2))).toMatch(/informe a data/i);
    expect(validarPeriodo(daqui(1), "")).toMatch(/informe a data/i);
  });

  it("exige fim depois do início", () => {
    expect(validarPeriodo(daqui(5), daqui(2))).toMatch(/depois do inicial/i);
  });

  it("rejeita fim igual ao início", () => {
    const mesmo = daqui(2);
    expect(validarPeriodo(mesmo, mesmo)).toMatch(/depois do inicial/i);
  });

  it("rejeita data inválida", () => {
    expect(validarPeriodo("não é data", daqui(2))).toMatch(/inválida/i);
  });
});

describe("validarPeriodo — passado e horizonte futuro", () => {
  it("bloqueia início no passado por padrão", () => {
    expect(validarPeriodo(daqui(-48), daqui(-24))).toMatch(/passado/i);
  });

  it("permite passado quando a opção está ligada (Anexo II é retroativo)", () => {
    expect(validarPeriodo(daqui(-48), daqui(-24), { permitePassado: true })).toBeNull();
  });

  it("bloqueia agendamento muito distante — pega erro de digitação no ano", () => {
    expect(validarPeriodo("2126-08-07T10:00", "2126-08-08T10:00")).toMatch(/antecedência|passar de/i);
  });
});

describe("formatarDuracao", () => {
  it("formata minutos", () => expect(formatarDuracao(daqui(0), daqui(0.5))).toBe("30 min"));
  it("formata horas cheias", () => expect(formatarDuracao(daqui(0), daqui(2))).toBe("2h"));
  it("formata dias", () => expect(formatarDuracao(daqui(0), daqui(48))).toBe("2 dias"));
  it("formata dia no singular", () => expect(formatarDuracao(daqui(0), daqui(24))).toBe("1 dia"));
  it("devolve travessão para intervalo inválido", () => expect(formatarDuracao(daqui(5), daqui(1))).toBe("—"));
});

describe("formatarDataHoraBR", () => {
  it("usa o formato brasileiro, não o locale do sistema", () => {
    // 7 de agosto — em formato americano sairia 08/07
    expect(formatarDataHoraBR("2026-08-07T14:30")).toMatch(/^07\/08\/2026/);
  });
  it("devolve travessão para vazio", () => expect(formatarDataHoraBR("")).toBe("—"));
});
