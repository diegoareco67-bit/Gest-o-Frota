import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

const usuario = gerarDados({ perfil: "usuario" });
const gestor = gerarDados({ perfil: "gestor" });

test.describe("Usuario — Veículo Próprio (Anexo I) — já aprovado", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/usuario/veiculo-proprio");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Cadastro de Veículo Próprio", async ({ page }) => {
    await expect(page.getByText("Cadastro de Veículo Próprio")).toBeVisible();
  });

  test("exibe os dados do veículo já cadastrado", async ({ page }) => {
    await expect(page.getByText(/Fiat Strada — TST-0001/)).toBeVisible({ timeout: 5000 });
  });

  test("exibe o status Aprovado", async ({ page }) => {
    await expect(page.getByText("Aprovado")).toBeVisible({ timeout: 5000 });
  });

  test("exibe link para ver o termo assinado", async ({ page }) => {
    await expect(page.getByText("Ver termo assinado")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Usuario — Indenizações (Anexo II) — desbloqueado", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, usuario);
    await page.goto("/usuario/indenizacoes");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Indenização de Transporte", async ({ page }) => {
    await expect(page.getByText("Indenização de Transporte")).toBeVisible();
  });

  test("exibe botão + Nova Indenização (não bloqueado)", async ({ page }) => {
    await expect(page.getByRole("button", { name: /nova indenização/i })).toBeVisible({ timeout: 5000 });
  });

  test("abre o formulário e gera o PDF do Boletim", async ({ page }) => {
    await page.getByRole("button", { name: /nova indenização/i }).click();
    await page.getByPlaceholder("Vistoria de obra pública").fill("Vistoria de teste QA");
    await page.getByPlaceholder("Dourados/MS").fill("Dourados/MS");
    const dt = page.locator('input[type="datetime-local"]');
    await dt.nth(0).fill("2026-08-01T08:00");
    await dt.nth(1).fill("2026-08-01T17:00");
    const num = page.locator('input[type="number"]');
    await num.nth(0).fill("1000");
    await page.getByPlaceholder("Trajeto percorrido").fill("Campo Grande - Dourados");
    await num.nth(3).fill("450");
    await num.nth(4).fill("1450");

    await page.getByRole("button", { name: /gerar boletim/i }).click();

    // Chegou até a etapa de upload do PDF assinado — não envia de verdade
    // (dispararia e-mail real ao RH via Apps Script, fora do escopo deste mock).
    await expect(page.locator('input[type="file"]')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /enviar ao rh/i })).toBeVisible();
  });
});

test.describe("Usuario — Veículo Próprio — bloqueado antes de cadastrar", () => {
  test("Indenizações fica bloqueada sem Anexo I aprovado", async ({ page }) => {
    // Login como outro servidor (Pedro Motorista), cujo Anexo I está "pendente", não aprovado
    await fazerLogin(page, gerarDados({ perfil: "usuario", email: "outro@cge.ms.gov.br", nome: "Pedro Motorista" }));
    await page.goto("/usuario/indenizacoes");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Termo de Opção \(Anexo I\)/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /nova indenização/i })).not.toBeVisible();
  });
});

test.describe("Gestor — Indenizações — aprovação do Anexo I", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, gestor);
    await page.goto("/gestor/indenizacoes");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o título Indenização de Transporte", async ({ page }) => {
    await expect(page.getByText("Indenização de Transporte")).toBeVisible();
  });

  test("aba Veículos Próprios mostra o pendente de Pedro Motorista", async ({ page }) => {
    await expect(page.getByText("Pedro Motorista")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /aprovar/i })).toBeVisible();
  });

  test("aprova o Anexo I pendente", async ({ page }) => {
    await page.getByRole("button", { name: /aprovar/i }).click();
    await page.waitForLoadState("networkidle");
    // some da lista de pendentes e passa a aparecer como decidido
    await expect(page.getByRole("button", { name: /aprovar/i })).not.toBeVisible({ timeout: 5000 });
  });

  test("aba Indenizações mostra a lista", async ({ page }) => {
    // Escopado ao conteúdo: "Indenizações" também é um item da Sidebar
    await page.locator("main").getByRole("button", { name: /indenizações \(/i }).click();
    await expect(page.getByText(/nenhuma indenização|#IND/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Usuario — Indenizações bloqueada — chamada para ação", () => {
  test("mostra botão explícito de iniciar o requerimento, não só um link no texto", async ({ page }) => {
    // "terceiro" é o servidor de teste sem Anexo I cadastrado
    await fazerLogin(page, gerarDados({ perfil: "usuario", email: "terceiro@cge.ms.gov.br" }));
    await page.goto("/usuario/indenizacoes");
    await page.waitForLoadState("networkidle");

    const botao = page.getByRole("button", { name: /iniciar preenchimento do requerimento/i });
    await expect(botao).toBeVisible({ timeout: 5000 });

    await botao.click();
    await expect(page).toHaveURL(/\/usuario\/veiculo-proprio/, { timeout: 5000 });
  });
});
