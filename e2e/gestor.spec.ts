import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor", nome: "Maria Gestora" });

test.describe("Gestor — Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
  });

  test("exibe o nome do gestor após login", async ({ page }) => {
    await expect(page.getByText(/maria/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("exibe a logo FrotaGov", async ({ page }) => {
    await expect(page.getByText("FrotaGov").first()).toBeVisible();
  });

  test("dashboard renderiza sem travar", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

test.describe("Gestor — Navegação pelas rotas", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
  });

  test("navega para /gestor/aprovacoes", async ({ page }) => {
    await page.goto("/gestor/aprovacoes");
    await expect(page).toHaveURL(/\/gestor\/aprovacoes/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("navega para /gestor/veiculos", async ({ page }) => {
    await page.goto("/gestor/veiculos");
    await expect(page).toHaveURL(/\/gestor\/veiculos/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("navega para /gestor/usuarios", async ({ page }) => {
    await page.goto("/gestor/usuarios");
    await expect(page).toHaveURL(/\/gestor\/usuarios/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("navega para /gestor/manutencao", async ({ page }) => {
    await page.goto("/gestor/manutencao");
    await expect(page).toHaveURL(/\/gestor\/manutencao/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("navega para /gestor/relatorios", async ({ page }) => {
    await page.goto("/gestor/relatorios");
    await expect(page).toHaveURL(/\/gestor\/relatorios/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

test.describe("Gestor — Controle de acesso", () => {
  test("gestor não acessa rotas de usuario — redireciona para /gestor", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/usuario");
    await expect(page).toHaveURL(/\/gestor/, { timeout: 5000 });
  });

  test("gestor não acessa solicitar do usuario — redireciona para /gestor", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/usuario/solicitar");
    await expect(page).toHaveURL(/\/gestor/, { timeout: 5000 });
  });
});

test.describe("Gestor — Aprovações", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/aprovacoes");
    await page.waitForLoadState("networkidle");
  });

  test("abre a página de aprovações", async ({ page }) => {
    await expect(page).toHaveURL(/\/gestor\/aprovacoes/);
  });

  test("renderiza a página de aprovações sem travar", async ({ page }) => {
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
