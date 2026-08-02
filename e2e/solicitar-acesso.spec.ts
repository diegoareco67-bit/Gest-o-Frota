import { test, expect } from "@playwright/test";

test.describe("Solicitar Acesso — envio e cooldown", () => {
  test("preenche e envia a solicitação, e a tela de sucesso avisa que o e-mail só vem após aprovação", async ({ page }) => {
    await page.goto("/solicitar-acesso");
    await page.getByLabel("Nome Completo *").fill("Teste QA");
    await page.getByLabel("E-mail Institucional *").fill("teste.qa@cge.ms.gov.br");
    await page.getByLabel("Matrícula *").fill("999999");
    await page.getByLabel("Número da CNH *").fill("12345678900");
    await page.getByLabel("Vencimento da CNH *").fill("2030-01-01");
    await page.getByLabel("Número do Diário Oficial *").fill("11.234");
    await page.getByLabel("Data de Publicação *").fill("2026-01-01");
    await page.getByLabel("Número da Resolução *").fill("123/2025");
    await page.getByRole("button", { name: /enviar solicitação/i }).click();

    await expect(page.getByText("Solicitação Enviada!")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Nenhum e-mail é enviado agora/i)).toBeVisible();
    await expect(page.getByText("teste.qa@cge.ms.gov.br")).toBeVisible();
  });

  test("bloqueia reenvio dentro do cooldown, mostrando a tela de sucesso de novo em vez do formulário", async ({ page }) => {
    await page.goto("/solicitar-acesso");
    await page.evaluate(() => {
      localStorage.setItem("hub_ultima_solicitacao_acesso", JSON.stringify({ email: "cooldown@cge.ms.gov.br", ts: Date.now() }));
    });
    await page.reload();

    await expect(page.getByText("Solicitação Enviada!")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/você já enviou uma solicitação recentemente/i)).toBeVisible();
    await expect(page.getByLabel("Nome Completo *")).not.toBeVisible();
  });

  test("cooldown expirado libera o formulário de novo", async ({ page }) => {
    await page.goto("/solicitar-acesso");
    await page.evaluate(() => {
      const vintECincoHorasAtras = Date.now() - 25 * 60 * 60 * 1000;
      localStorage.setItem("hub_ultima_solicitacao_acesso", JSON.stringify({ email: "expirado@cge.ms.gov.br", ts: vintECincoHorasAtras }));
    });
    await page.reload();

    await expect(page.getByLabel("Nome Completo *")).toBeVisible({ timeout: 5000 });
  });
});
