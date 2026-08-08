import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const admin = gerarDados({ perfil: "administrativo" });

test.describe("Perfil administrativo — acesso aos recursos", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, admin);
  });

  test("cai na tela inicial própria após o login", async ({ page }) => {
    await expect(page).toHaveURL(/\/administrativo/);
    await expect(page.locator("main").getByText(/Sandra/)).toBeVisible();
  });

  test("o rótulo do perfil aparece na barra lateral", async ({ page }) => {
    await expect(page.getByText(/Administrativo · CGE-MS/)).toBeVisible();
  });

  test("gerencia veículos", async ({ page }) => {
    await page.goto("/gestor/veiculos");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /novo veículo/i })).toBeVisible({ timeout: 5000 });
  });

  test("gerencia setores", async ({ page }) => {
    await page.goto("/gestor/setores");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").getByText("Setores", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("decide Termos de Opção", async ({ page }) => {
    await page.goto("/gestor/indenizacoes");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /aprovar/i })).toBeVisible({ timeout: 5000 });
  });

  test("cadastra sala (mantém o catálogo)", async ({ page }) => {
    await page.goto("/salas");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /nova sala/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Perfil administrativo — limites de permissão", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, admin);
  });

  test("NÃO gerencia usuários — seria escalonamento de privilégio", async ({ page }) => {
    await page.goto("/gestor/usuarios");
    await expect(page).toHaveURL(/\/administrativo/, { timeout: 5000 });
  });

  test("NÃO altera configurações — o valor do km é dinheiro público", async ({ page }) => {
    await page.goto("/gestor/configuracoes");
    await expect(page).toHaveURL(/\/administrativo/, { timeout: 5000 });
  });

  test("a barra lateral não oferece Usuários nem Configurações", async ({ page }) => {
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("button", { name: /^usuários$/i })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^configurações$/i })).not.toBeVisible();
  });
});

test.describe("Gestor — gerência de níveis de acesso", () => {
  test("altera o perfil de um usuário existente", async ({ page }) => {
    await fazerLogin(page, gerarDados({ perfil: "gestor" }));
    await page.goto("/gestor/usuarios");
    await page.waitForLoadState("networkidle");

    // O badge de perfil é clicável e vira seletor
    const badge = page.getByRole("button", { name: /Usuário ▾/ }).first();
    await expect(badge).toBeVisible({ timeout: 5000 });
    await badge.click();

    await page.locator('select[aria-label^="Nível de acesso"]').selectOption("auditor");
    await expect(page.getByText(/agora tem o perfil Auditor/i)).toBeVisible({ timeout: 5000 });
  });
});
