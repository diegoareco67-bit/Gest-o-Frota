import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const gestor = gerarDados({ perfil: "gestor" });

test.describe("Gestor — Manual de Uso da Aplicação", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/manual");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Manual de Uso da Aplicação", async ({ page }) => {
    await expect(page.locator("main").getByText("Manual de Uso da Aplicação", { exact: true })).toBeVisible();
  });

  test("exibe os 7 cards de módulo", async ({ page }) => {
    const titulos = ["Veículos", "Salas", "Equipamentos", "Manutenção", "Usuários", "Setores", "Indenizações"];
    for (const t of titulos) {
      await expect(page.locator("main").getByText(t, { exact: true })).toBeVisible();
    }
  });

  test("cada card tem um link de download com o PDF correto", async ({ page }) => {
    const esperados = [
      "manual-veiculos.pdf", "manual-salas.pdf", "manual-equipamentos.pdf",
      "manual-manutencao.pdf", "manual-usuarios.pdf", "manual-setores.pdf", "manual-indenizacoes.pdf",
    ];
    for (const arquivo of esperados) {
      await expect(page.locator(`a[href="/manuais/${arquivo}"]`)).toBeVisible();
    }
  });

  test("link do PDF de Veículos responde com sucesso", async ({ page, request }) => {
    const href = await page.locator('a[href="/manuais/manual-veiculos.pdf"]').getAttribute("href");
    const resposta = await request.get(href!);
    expect(resposta.ok()).toBeTruthy();
  });
});

test.describe("Gestor — Navegação pelo Sidebar", () => {
  test("clicar em Manual de Uso da Aplicação navega para /gestor/manual", async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.getByRole("button", { name: /manual de uso da aplicação/i }).click();
    await expect(page).toHaveURL(/\/gestor\/manual/);
  });
});

test.describe("Usuario — Controle de acesso ao Manual de Uso", () => {
  test("usuario não acessa o manual do gestor — redireciona para /usuario", async ({ page }) => {
    const usuario = gerarDados({ perfil: "usuario" });
    await fazerLogin(page, usuario);
    await page.goto("/gestor/manual");
    await expect(page).toHaveURL(/\/usuario/, { timeout: 5000 });
  });
});
