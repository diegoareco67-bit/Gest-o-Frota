import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });

test.describe("Gestor — Segurança (2FA)", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/seguranca");
    await page.waitForLoadState("networkidle");
  });

  test("exibe a tela de Segurança da Conta", async ({ page }) => {
    await expect(page.locator("main").getByText("Segurança da Conta", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /ativar verificação em duas etapas/i })).toBeVisible();
  });

  test("iniciar ativação mostra a chave e o campo de código", async ({ page }) => {
    await page.getByRole("button", { name: /ativar verificação em duas etapas/i }).click();
    await expect(page.getByText(/MOCKSECRETKEY/).first()).toBeVisible();
    await expect(page.getByLabel(/código de verificação/i)).toBeVisible();
  });
});

test.describe("Segurança — controle de acesso", () => {
  test("usuario não acessa a tela de Segurança do gestor", async ({ page }) => {
    const usuario = gerarDados({ perfil: "usuario" });
    await fazerLogin(page, usuario);
    await page.goto("/gestor/seguranca");
    await expect(page).toHaveURL(/\/usuario/, { timeout: 5000 });
  });
});
