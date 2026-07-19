import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });

test.describe("Gestor — Relatórios", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/relatorios");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Relatórios", async ({ page }) => {
    await expect(page.locator("main").getByText("Relatórios", { exact: true })).toBeVisible();
  });

  test("exibe card de relatório Utilização da Frota", async ({ page }) => {
    await expect(page.getByText("Utilização da Frota").first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe card de relatório Solicitações", async ({ page }) => {
    await expect(page.locator("main").getByText("Solicitações", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Total de Veículos", async ({ page }) => {
    await expect(page.getByText("Total de Veículos")).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Disponíveis", async ({ page }) => {
    await expect(page.getByText("Disponíveis").first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Em Manutenção", async ({ page }) => {
    await expect(page.getByText("Em Manutenção")).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Disponibilidade", async ({ page }) => {
    await expect(page.getByText("Disponibilidade", { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Custo Manutenções", async ({ page }) => {
    await expect(page.getByText("Custo Manutenções")).toBeVisible({ timeout: 5000 });
  });

  test("exibe card Usuários (ativos)", async ({ page }) => {
    await expect(page.getByText("ativos")).toBeVisible({ timeout: 5000 });
  });

  test("exibe botões de exportação CSV", async ({ page }) => {
    await expect(page.getByRole("button", { name: /csv viagens/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /csv agendamentos/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /csv manutenções/i })).toBeVisible();
  });
});
