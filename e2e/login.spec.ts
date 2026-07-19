import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

test.describe("Login — renderização", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("exibe o título FrotaGov", async ({ page }) => {
    await expect(page.getByText("FrotaGov", { exact: true })).toBeVisible();
  });

  test("exibe o campo de e-mail institucional", async ({ page }) => {
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("exibe o campo de senha", async ({ page }) => {
    await expect(page.locator("#login-senha")).toBeVisible();
  });

  test("exibe o botão Entrar no sistema", async ({ page }) => {
    await expect(page.getByRole("button", { name: /entrar no sistema/i })).toBeVisible();
  });

  test("exibe o link para solicitar cadastro", async ({ page }) => {
    await expect(page.getByRole("button", { name: /solicitar cadastro/i })).toBeVisible();
  });
});

test.describe("Login — interação de senha", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("campo de senha começa oculto (type=password)", async ({ page }) => {
    await expect(page.locator("#login-senha")).toHaveAttribute("type", "password");
  });

  test("botão olho alterna visibilidade da senha", async ({ page }) => {
    const senhaInput = page.locator("#login-senha");
    const eyeBtn = page.locator('button[aria-label="Exibir senha"], button[aria-label="Ocultar senha"]').first();

    await expect(senhaInput).toHaveAttribute("type", "password");
    await eyeBtn.click();
    await expect(senhaInput).toHaveAttribute("type", "text");
    await eyeBtn.click();
    await expect(senhaInput).toHaveAttribute("type", "password");
  });
});

test.describe("Login — autenticação de usuario", () => {
  test("login bem-sucedido redireciona para /usuario", async ({ page }) => {
    const dados = gerarDados({ perfil: "usuario" });
    await fazerLogin(page, dados);
    await expect(page).toHaveURL(/\/usuario/);
  });
});

test.describe("Login — autenticação de gestor", () => {
  test("login bem-sucedido redireciona para /gestor", async ({ page }) => {
    const dados = gerarDados({ perfil: "gestor" });
    await fazerLogin(page, dados);
    await expect(page).toHaveURL(/\/gestor/);
  });
});

test.describe("Login — credenciais inválidas", () => {
  test("exibe mensagem de erro ao falhar login", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#login-email", "errado@cge.ms.gov.br");
    await page.fill("#login-senha", "senhaerrada");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Login — proteção de rotas", () => {
  test("acesso a /usuario sem autenticação redireciona para /login", async ({ page }) => {
    await page.goto("/usuario");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("acesso a /gestor sem autenticação redireciona para /login", async ({ page }) => {
    await page.goto("/gestor");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("acesso a rota desconhecida redireciona para /login", async ({ page }) => {
    await page.goto("/pagina-que-nao-existe");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
