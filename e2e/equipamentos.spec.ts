import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const usuario = gerarDados({ perfil: "usuario" });
const gestor = gerarDados({ perfil: "gestor" });

test.describe("Usuario — Equipamentos — Renderização", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/equipamentos");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Equipamentos", async ({ page }) => {
    await expect(page.locator("main").getByText("Equipamentos", { exact: true }).first()).toBeVisible();
  });

  test("exibe o equipamento do catálogo", async ({ page }) => {
    await expect(page.getByText("Notebook Dell Latitude")).toBeVisible();
  });

  test("exibe o status Disponível do equipamento", async ({ page }) => {
    await expect(page.getByText("Disponível")).toBeVisible();
  });

  test("exibe botão + Reservar Equipamento", async ({ page }) => {
    await expect(page.getByRole("button", { name: /reservar equipamento/i })).toBeVisible();
  });
});

test.describe("Gestor — Equipamentos — Cadastro", () => {
  test("cadastra um novo equipamento", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/equipamentos");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /novo equipamento/i }).click();
    await page.getByPlaceholder("Notebook Dell Latitude").fill("Projetor Epson");
    await page.getByPlaceholder(/notebook, projetor, câmera/i).fill("Projetor");
    await page.getByPlaceholder("123456").fill("999888");
    await page.getByRole("button", { name: /^cadastrar$/i }).click();

    await expect(page.getByText("Projetor Epson")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Usuario — Equipamentos — Ciclo de empréstimo", () => {
  test("reserva, retira e devolve um equipamento", async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/equipamentos");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /reservar equipamento/i }).click();
    await page.locator('[role="dialog"] select').selectOption({ index: 1 });
    // Amanhã, não hoje: a validação de período rejeita início no passado, e "hoje 14h"
    // já estaria vencido sempre que a suíte rodasse depois das 14h.
    const amanha = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(amanha);
    const horas = page.locator('input[type="time"]');
    await horas.nth(0).fill("14:00");
    await horas.nth(1).fill("15:00");
    await page.getByPlaceholder("Apresentação externa").fill("Teste QA de empréstimo");
    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    await expect(page.getByText("Teste QA de empréstimo")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /^retirar$/i })).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /^retirar$/i }).click();
    await expect(page.getByRole("button", { name: /^devolver$/i })).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /^devolver$/i }).click();
    await expect(page.getByText("Nenhum empréstimo ativo.")).toBeVisible({ timeout: 5000 });
  });
});
