import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const usuario = gerarDados({ perfil: "usuario" });

test.describe("Usuario — Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.waitForLoadState("networkidle");
  });

  test("exibe saudação com nome do usuario", async ({ page }) => {
    await expect(page.getByText(/joão/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Pendentes", async ({ page }) => {
    await expect(page.getByText("Pendentes")).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Aprovadas", async ({ page }) => {
    await expect(page.getByText("Aprovadas")).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Concluídas", async ({ page }) => {
    await expect(page.getByText("Concluídas")).toBeVisible({ timeout: 5000 });
  });

  test("exibe seção Solicitações Recentes", async ({ page }) => {
    await expect(page.getByText("Solicitações Recentes")).toBeVisible({ timeout: 5000 });
  });

  test("exibe seção Ações Rápidas", async ({ page }) => {
    await expect(page.getByText("Ações Rápidas")).toBeVisible({ timeout: 5000 });
  });

  test("exibe botão Nova Solicitação na sidebar", async ({ page }) => {
    await expect(page.getByRole("button", { name: /nova solicitação/i }).first()).toBeVisible();
  });

  test("exibe botão Minhas Solicitações na sidebar", async ({ page }) => {
    await expect(page.getByRole("button", { name: /minhas solicitações/i }).first()).toBeVisible();
  });
});

test.describe("Usuario — Minhas Solicitações", () => {
  test("exibe página de Minhas Solicitações", async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/usuario/solicitacoes");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").getByText("Minhas Solicitações", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("exibe as solicitações do usuário", async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/usuario/solicitacoes");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Hospital Municipal")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Usuario — Checkout", () => {
  test("exibe página de Retirada do Veículo com dados da solicitação", async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/usuario/checkout/sol-002");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Retirada do Veículo")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Secretaria de Educação")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Usuario — Checkin", () => {
  test("exibe página de Devolução do Veículo com dados da solicitação", async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/usuario/checkin/sol-002");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Devolução do Veículo")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Secretaria de Educação")).toBeVisible({ timeout: 5000 });
  });
});
