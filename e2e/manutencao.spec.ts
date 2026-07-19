import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });

test.describe("Gestor — Manutenção — Lista", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/manutencao");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Manutenções", async ({ page }) => {
    await expect(page.locator("main").getByText("Manutenções", { exact: true })).toBeVisible();
  });

  test("exibe botão Nova Manutenção", async ({ page }) => {
    await expect(page.getByRole("button", { name: /nova manutenção/i })).toBeVisible();
  });

  test("filtro de status tem a opção Todas (Status)", async ({ page }) => {
    await expect(page.locator('select option[value="todas"]')).toHaveCount(1);
  });

  test("filtro de status tem a opção Agendada", async ({ page }) => {
    await expect(page.locator('select option[value="agendada"]')).toHaveCount(1);
  });

  test("filtro de status tem a opção Em andamento", async ({ page }) => {
    await expect(page.locator('select option[value="em_andamento"]')).toHaveCount(1);
  });

  test("exibe placa ABC-1234 na lista", async ({ page }) => {
    await expect(page.getByText("ABC-1234").first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe status Agendada para man-001", async ({ page }) => {
    await expect(page.locator("table").getByText(/^agendada$/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe botão Concluir para item agendado", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^concluir$/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("filtro Concluída mostra XYZ-5678", async ({ page }) => {
    await page.locator("select").selectOption("concluida");
    await expect(page.getByText("XYZ-5678").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Gestor — Manutenção — Cadastro", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/manutencao");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /nova manutenção/i }).click();
  });

  test("abre modal com título Nova Manutenção", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /nova manutenção/i })).toBeVisible({ timeout: 3000 });
  });

  test("modal exibe campo de descrição", async ({ page }) => {
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("modal exibe campo de oficina", async ({ page }) => {
    await expect(page.getByPlaceholder(/oficina/i)).toBeVisible();
  });

  test("modal tem botão Salvar", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^salvar$/i })).toBeVisible();
  });

  test("botão Cancelar fecha o modal", async ({ page }) => {
    await page.getByRole("button", { name: /^cancelar$/i }).click();
    await expect(page.getByRole("heading", { name: /nova manutenção/i })).not.toBeVisible({ timeout: 3000 });
  });

  test("preenche veículo e descrição e salva", async ({ page }) => {
    await page.locator('[role="dialog"] select').first().selectOption({ index: 1 });
    await page.locator("textarea").fill("Revisão de rotina completa");
    await page.getByPlaceholder(/oficina/i).fill("Oficina Teste");
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await expect(page.getByRole("heading", { name: /nova manutenção/i })).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Oficina Teste")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Gestor — Manutenção — Ação Concluir", () => {
  test("concluir manutenção reduz número de botões Concluir", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/manutencao");
    await page.waitForLoadState("networkidle");

    const botoes = page.getByRole("button", { name: /^concluir$/i });
    const contagem = await botoes.count();
    if (contagem > 0) {
      await botoes.first().click();
      await page.waitForLoadState("networkidle");
      const novaContagem = await page.getByRole("button", { name: /^concluir$/i }).count();
      expect(novaContagem).toBeLessThan(contagem);
    }
  });
});
