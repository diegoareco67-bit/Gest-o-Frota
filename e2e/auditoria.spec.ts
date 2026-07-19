import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });
const auditor = gerarDados({ perfil: "auditor" });

test.describe("Gestor — Trilha de Auditoria", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/auditoria");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Trilha de Auditoria", async ({ page }) => {
    await expect(page.locator("main").getByText("Trilha de Auditoria", { exact: true })).toBeVisible();
  });

  test("lista registros semeados (ação e autor)", async ({ page }) => {
    await expect(page.getByText("Aprovou solicitação", { exact: true })).toBeVisible();
    await expect(page.getByText("Retirou veículo", { exact: true })).toBeVisible();
    await expect(page.locator("table").getByText("Maria Gestora")).toBeVisible();
  });

  test("busca filtra os registros", async ({ page }) => {
    await page.getByPlaceholder(/buscar por ação/i).fill("retirou");
    await expect(page.getByText("Retirou veículo", { exact: true })).toBeVisible();
    await expect(page.getByText("Aprovou solicitação", { exact: true })).toBeHidden();
  });
});

test.describe("Auditor — perfil de fiscalização", () => {
  test("login de auditor cai na Trilha de Auditoria", async ({ page }) => {
    await fazerLogin(page, auditor);
    await expect(page).toHaveURL(/\/auditor/);
    await expect(page.locator("main").getByText("Trilha de Auditoria", { exact: true })).toBeVisible();
  });

  test("sidebar do auditor mostra Auditoria e Relatórios, sem itens de gestão", async ({ page }) => {
    await fazerLogin(page, auditor);
    await expect(page.getByText("FISCALIZAÇÃO", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /relatórios/i })).toBeVisible();
    await expect(page.getByText("GESTÃO", { exact: true })).toBeHidden();
  });

  test("auditor acessa Relatórios", async ({ page }) => {
    await fazerLogin(page, auditor);
    await page.goto("/gestor/relatorios");
    await expect(page).toHaveURL(/\/gestor\/relatorios/);
    await expect(page.locator("main").getByText("Relatórios", { exact: true })).toBeVisible();
  });

  test("auditor não acessa telas de gestão — redireciona para /auditor", async ({ page }) => {
    await fazerLogin(page, auditor);
    await page.goto("/gestor/usuarios");
    await expect(page).toHaveURL(/\/auditor/, { timeout: 5000 });
  });
});
