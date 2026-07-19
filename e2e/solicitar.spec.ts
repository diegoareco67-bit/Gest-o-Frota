import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const usuario = gerarDados({ perfil: "usuario" });

test.describe("Usuario — Solicitar Veículo", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/usuario/solicitar");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Nova Solicitação", async ({ page }) => {
    await expect(page.locator("main").getByText("Nova Solicitação", { exact: true })).toBeVisible();
  });

  test("exibe o select de veículos", async ({ page }) => {
    await expect(page.locator("select")).toBeVisible();
  });

  test("exibe o veículo ABC-1234 no select", async ({ page }) => {
    await page.waitForFunction(() => {
      const sel = document.querySelector("select");
      return sel && sel.options.length > 1;
    }, { timeout: 5000 });
    const texto = await page.locator("select").textContent();
    expect(texto).toContain("ABC-1234");
  });

  test("exibe apenas veículos com status disponível (XYZ-5678 em uso não aparece)", async ({ page }) => {
    const textoSelect = await page.locator("select").textContent();
    expect(textoSelect).toContain("ABC-1234");
    expect(textoSelect).not.toContain("XYZ-5678");
  });

  test("exibe campo de destino", async ({ page }) => {
    await expect(page.getByPlaceholder(/hospital cge-ms/i)).toBeVisible();
  });

  test("exibe campo de motivo", async ({ page }) => {
    await expect(page.getByPlaceholder(/transporte de pacientes/i)).toBeVisible();
  });

  test("exibe campos de data de saída e retorno", async ({ page }) => {
    const dtInputs = page.locator('input[type="datetime-local"]');
    await expect(dtInputs).toHaveCount(2);
  });

  test("preenche e envia o formulário e exibe confirmação", async ({ page }) => {
    await page.locator("select").selectOption({ index: 1 });

    await page.getByPlaceholder(/hospital cge-ms/i).fill("Hospital Geral do Estado");
    await page.getByPlaceholder(/transporte de pacientes/i).fill("Transporte de material");

    const dtInputs = page.locator('input[type="datetime-local"]');
    await dtInputs.nth(0).fill("2025-06-01T08:00");
    await dtInputs.nth(1).fill("2025-06-01T17:00");

    await page.click('button[type="submit"]');
    await expect(page.getByText(/solicitação enviada/i)).toBeVisible({ timeout: 5000 });
  });

  test("após envio exibe botão para ver minhas solicitações", async ({ page }) => {
    await page.locator("select").selectOption({ index: 1 });
    await page.getByPlaceholder(/hospital cge-ms/i).fill("Destino Teste");
    await page.getByPlaceholder(/transporte de pacientes/i).fill("Motivo Teste");
    const dtInputs = page.locator('input[type="datetime-local"]');
    await dtInputs.nth(0).fill("2025-06-02T09:00");
    await dtInputs.nth(1).fill("2025-06-02T18:00");
    await page.click('button[type="submit"]');
    await expect(page.getByRole("button", { name: /ver minhas solicitações/i })).toBeVisible({ timeout: 5000 });
  });

  test("botão Cancelar navega de volta para /usuario", async ({ page }) => {
    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page).toHaveURL(/\/usuario$/, { timeout: 5000 });
  });
});
