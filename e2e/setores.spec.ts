import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });

test.describe("Gestor — Setores — Lista", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/setores");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Setores", async ({ page }) => {
    await expect(page.locator("main").getByText("Setores", { exact: true })).toBeVisible();
  });

  test("exibe os setores cadastrados", async ({ page }) => {
    await expect(page.getByText("TI", { exact: true })).toBeVisible();
    await expect(page.getByText("Secretaria de Obras")).toBeVisible();
    await expect(page.getByText("Gestão", { exact: true })).toBeVisible();
  });

  test("exibe botão Desativar para setor ativo", async ({ page }) => {
    await expect(page.getByRole("button", { name: /desativar/i }).first()).toBeVisible();
  });
});

test.describe("Gestor — Setores — Cadastro", () => {
  test("cadastra um novo setor", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/setores");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("Nome do setor").fill("Setor de Teste QA");
    await page.getByRole("button", { name: /adicionar/i }).click();

    await expect(page.getByText("Setor de Teste QA")).toBeVisible({ timeout: 5000 });
  });

  test("não permite cadastrar setor duplicado", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/setores");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("Nome do setor").fill("TI");
    await page.getByRole("button", { name: /adicionar/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Gestor — Setores — Ativar/Desativar", () => {
  test("desativa e reativa um setor", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/setores");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /desativar/i }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /reativar/i }).first()).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /reativar/i }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /desativar/i }).first()).toBeVisible({ timeout: 5000 });
  });
});
