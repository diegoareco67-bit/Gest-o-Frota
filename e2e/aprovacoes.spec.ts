import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });

test.describe("Gestor — Aprovações — Renderização", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/aprovacoes");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Aprovações", async ({ page }) => {
    await expect(page.locator("main").getByText("Aprovações", { exact: true })).toBeVisible();
  });

  test("exibe os filtros de status", async ({ page }) => {
    await expect(page.getByRole("button", { name: /pendentes/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /aprovadas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /recusadas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /todas/i })).toBeVisible();
  });

  test("exibe solicitação pendente de João Usuário", async ({ page }) => {
    await expect(page.getByText("João Usuário")).toBeVisible({ timeout: 5000 });
  });

  test("exibe o destino Hospital Municipal", async ({ page }) => {
    await expect(page.getByText(/Hospital Municipal/)).toBeVisible({ timeout: 5000 });
  });

  test("exibe o veículo ABC-1234 na solicitação pendente", async ({ page }) => {
    await expect(page.getByText(/ABC-1234/)).toBeVisible({ timeout: 5000 });
  });

  test("exibe botão Aprovar para solicitação pendente", async ({ page }) => {
    await expect(page.getByRole("button", { name: /aprovar/i })).toBeVisible({ timeout: 5000 });
  });

  test("exibe botão Recusar para solicitação pendente", async ({ page }) => {
    await expect(page.getByRole("button", { name: /recusar/i })).toBeVisible({ timeout: 5000 });
  });

  test("contador de pendentes mostra 1", async ({ page }) => {
    await expect(page.getByRole("button", { name: /pendentes\s*1/i })).toBeVisible({ timeout: 5000 });
  });

  test("aba Aprovadas exibe solicitação com destino Secretaria de Educação", async ({ page }) => {
    await page.getByRole("button", { name: /aprovadas/i }).click();
    await expect(page.getByText(/Secretaria de Educação/)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Gestor — Aprovações — Ações", () => {
  test("aprovar solicitação reduz contador de pendentes para zero", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/aprovacoes");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /aprovar/i }).click();
    await expect(page.getByRole("button", { name: /pendentes\s*0/i })).toBeVisible({ timeout: 5000 });
  });

  test("clicar Recusar revela campo de motivo", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/aprovacoes");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /✗ recusar|recusar/i }).first().click();
    await expect(page.getByPlaceholder(/motivo da recusa/i)).toBeVisible({ timeout: 3000 });
  });

  test("recusar com motivo move solicitação para aba Recusadas", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/aprovacoes");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /recusar/i }).first().click();
    await page.getByPlaceholder(/motivo da recusa/i).fill("Veículo indisponível na data");
    await page.getByRole("button", { name: /confirmar recusa/i }).click();
    await expect(page.getByRole("button", { name: /recusadas\s*1/i })).toBeVisible({ timeout: 5000 });
  });

  test("cancelar recusa volta a mostrar os botões Aprovar e Recusar", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/aprovacoes");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /recusar/i }).first().click();
    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByRole("button", { name: /aprovar/i })).toBeVisible({ timeout: 3000 });
  });
});
