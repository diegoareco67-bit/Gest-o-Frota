import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });

test.describe("Gestor — Veículos — Lista", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/veiculos");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Veículos", async ({ page }) => {
    await expect(page.locator("main").getByText("Veículos", { exact: true })).toBeVisible();
  });

  test("exibe a placa ABC-1234 na lista", async ({ page }) => {
    await expect(page.getByText("ABC-1234")).toBeVisible({ timeout: 5000 });
  });

  test("exibe o status Disponível para ABC-1234", async ({ page }) => {
    await expect(page.locator("table").getByText(/disponível/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe a placa XYZ-5678 na lista", async ({ page }) => {
    await expect(page.getByText("XYZ-5678")).toBeVisible({ timeout: 5000 });
  });

  test("exibe o status Em Uso para XYZ-5678", async ({ page }) => {
    await expect(page.locator("table").getByText(/em uso/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe marca e modelo Fiat Strada", async ({ page }) => {
    await expect(page.getByText(/Fiat Strada/)).toBeVisible({ timeout: 5000 });
  });

  test("exibe botão Editar para cada veículo", async ({ page }) => {
    const botoesEditar = page.getByRole("button", { name: /editar/i });
    await expect(botoesEditar.first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe botão Novo Veículo", async ({ page }) => {
    await expect(page.getByRole("button", { name: /novo veículo/i })).toBeVisible();
  });
});

test.describe("Gestor — Veículos — Cadastro", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/veiculos");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /novo veículo/i }).click();
  });

  test("abre modal com título Novo Veículo", async ({ page }) => {
    await expect(page.getByText("Novo Veículo").first()).toBeVisible({ timeout: 3000 });
  });

  test("modal exibe campo de Placa", async ({ page }) => {
    await expect(page.getByPlaceholder("HTO-3017")).toBeVisible();
  });

  test("modal exibe campo de Marca", async ({ page }) => {
    await expect(page.getByPlaceholder("Toyota")).toBeVisible();
  });

  test("modal exibe campo de Modelo", async ({ page }) => {
    await expect(page.getByPlaceholder("Corolla")).toBeVisible();
  });

  test("preenche e salva novo veículo", async ({ page }) => {
    await page.getByPlaceholder("HTO-3017").fill("DEF-9999");
    await page.getByPlaceholder("Toyota").fill("Volkswagen");
    await page.getByPlaceholder("Corolla").fill("Gol");
    await page.getByPlaceholder("0", { exact: true }).fill("5000");

    await page.getByRole("button", { name: /salvar/i }).click();

    await expect(page.getByText("DEF-9999")).toBeVisible({ timeout: 5000 });
  });

  test("modal tem botão Cancelar que fecha o modal", async ({ page }) => {
    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByPlaceholder("HTO-3017")).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe("Gestor — Veículos — Edição", () => {
  test("clicar Editar abre modal com dados preenchidos", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/veiculos");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /editar/i }).first().click();

    await expect(page.getByText(/editar veículo/i)).toBeVisible({ timeout: 3000 });
    const placaInput = page.getByPlaceholder("HTO-3017");
    await expect(placaInput).toHaveValue("ABC-1234");
  });
});
