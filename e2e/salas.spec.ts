import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const usuario = gerarDados({ perfil: "usuario" });
const gestor = gerarDados({ perfil: "gestor" });

test.describe("Usuario — Salas — Renderização", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/salas");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Salas", async ({ page }) => {
    await expect(page.locator("main").getByText("Salas", { exact: true }).first()).toBeVisible();
  });

  test("exibe o calendário de disponibilidade", async ({ page }) => {
    await expect(page.getByText("Disponibilidade das salas de reunião")).toBeVisible();
  });

  test("exibe seção Próximas reservas", async ({ page }) => {
    await expect(page.getByText("Próximas reservas")).toBeVisible();
  });

  test("exibe botão + Nova Reserva", async ({ page }) => {
    await expect(page.getByRole("button", { name: /nova reserva/i })).toBeVisible();
  });

  test("usuário não vê o card de Salas cadastradas (só gestor)", async ({ page }) => {
    await expect(page.getByText("Salas cadastradas")).not.toBeVisible();
  });
});

test.describe("Gestor — Salas — Cadastro de sala", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/salas");
    await page.waitForLoadState("networkidle");
  });

  test("exibe as salas cadastradas", async ({ page }) => {
    await expect(page.getByText("Sala de Reunião AGE")).toBeVisible();
    await expect(page.getByText("Sala de Treinamento")).toBeVisible();
  });

  test("cadastra uma nova sala", async ({ page }) => {
    await page.getByRole("button", { name: /nova sala/i }).click();
    await page.getByPlaceholder("Sala de Reuniões 1").fill("Sala de Teste QA");
    await page.getByPlaceholder("8").fill("6");
    await page.getByRole("button", { name: /^cadastrar$/i }).click();
    await expect(page.getByText("Sala de Teste QA")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Usuario — Salas — Reserva", () => {
  test("reserva uma sala e depois cancela", async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/salas");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /nova reserva/i }).click();
    await page.locator("#reserva-sala").selectOption({ index: 1 });
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(amanha);
    // Hora virou <select>: o seletor nativo não tinha confirmação, exigia clicar fora
    await page.locator("#reserva-inicio").selectOption("10:00");
    await page.locator("#reserva-fim").selectOption("11:00");
    await page.getByPlaceholder("Reunião de equipe").fill("Reunião de teste QA");
    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    await expect(page.getByText("Reunião de teste QA")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /^cancelar$/i }).click();
    await page.getByRole("button", { name: /sim, cancelar/i }).click();
    await expect(page.getByText("Reunião de teste QA")).not.toBeVisible({ timeout: 5000 });
  });

  test("não permite reservar sem preencher motivo", async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/salas");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /nova reserva/i }).click();
    await page.locator("#reserva-sala").selectOption({ index: 1 });
    await page.getByRole("button", { name: /confirmar reserva/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 3000 });
  });
});
