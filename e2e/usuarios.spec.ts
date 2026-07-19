import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });

test.describe("Gestor — Usuários — Lista", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/usuarios");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Usuários", async ({ page }) => {
    await expect(page.locator("main").getByText("Usuários", { exact: true })).toBeVisible();
  });

  test("exibe botão Novo Usuário", async ({ page }) => {
    await expect(page.getByRole("button", { name: /novo usuário/i })).toBeVisible();
  });

  test("exibe João Usuário na lista", async ({ page }) => {
    await expect(page.getByText("João Usuário")).toBeVisible({ timeout: 5000 });
  });

  test("exibe badge Ativo para João Usuário", async ({ page }) => {
    await expect(page.getByText("Ativo").first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe botão Desativar para usuário ativo", async ({ page }) => {
    await expect(page.getByRole("button", { name: /desativar/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe setor TI do usuário", async ({ page }) => {
    await expect(page.getByText(/TI/).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Gestor — Usuários — Cadastro", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/usuarios");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /novo usuário/i }).click();
  });

  test("abre modal com título Novo Usuário", async ({ page }) => {
    await expect(page.getByText("Novo Usuário").first()).toBeVisible({ timeout: 3000 });
  });

  test("modal exibe campo Nome completo", async ({ page }) => {
    await expect(page.getByPlaceholder("João da Silva")).toBeVisible();
  });

  test("modal exibe campo E-mail", async ({ page }) => {
    await expect(page.getByPlaceholder("joao@cge.ms.gov.br")).toBeVisible();
  });

  test("modal exibe campo Setor", async ({ page }) => {
    await expect(page.locator('[role="dialog"] select').first()).toBeVisible();
  });

  test("botão Cancelar fecha o modal", async ({ page }) => {
    await page.getByRole("button", { name: /^cancelar$/i }).click();
    await expect(page.getByPlaceholder("João da Silva")).not.toBeVisible({ timeout: 3000 });
  });

  test("preenche e cadastra novo usuário", async ({ page }) => {
    await page.getByPlaceholder("João da Silva").fill("Pedro Novo");
    await page.getByPlaceholder("joao@cge.ms.gov.br").fill("pedro@cge.ms.gov.br");
    await page.locator('[role="dialog"] select').first().selectOption({ index: 1 });

    await page.getByRole("button", { name: /^cadastrar$/i }).click();

    await expect(page.getByText("Pedro Novo", { exact: true })).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Gestor — Usuários — Toggle Ativo", () => {
  test("desativar usuário altera badge para Inativo", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/usuarios");
    await page.waitForLoadState("networkidle");

    const btnDesativar = page.getByRole("button", { name: /desativar/i }).first();
    await expect(btnDesativar).toBeVisible({ timeout: 5000 });
    await btnDesativar.click();

    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Inativo").first()).toBeVisible({ timeout: 5000 });
  });

  test("reativar usuário inativo muda badge para Ativo", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/usuarios");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /desativar/i }).first().click();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /reativar/i }).first().click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Ativo").first()).toBeVisible({ timeout: 5000 });
  });
});
