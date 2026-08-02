import { test, expect } from "@playwright/test";
import { gerarDados, fazerLogin } from "./fixtures/firebase";

// Servidor de teste "terceiro" não tem nenhum veiculoProprio cadastrado no mock —
// exercita o fluxo real de cadastro (gerar PDF -> upload do assinado -> Storage -> Firestore),
// cobertura que faltava (só havia testes do estado "já aprovado").
const terceiro = gerarDados({ perfil: "usuario", email: "terceiro@cge.ms.gov.br", nome: "Lucia Servidora" });

test.describe("Usuario — Veículo Próprio (Anexo I) — cadastro do zero", () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page, terceiro);
    await page.goto("/usuario/veiculo-proprio");
    await page.waitForLoadState("networkidle");
  });

  test("exibe o formulário de cadastro quando não há veículo próprio registrado", async ({ page }) => {
    await expect(page.getByLabel("Categoria funcional")).toBeVisible();
    await expect(page.getByRole("button", { name: /gerar termo de opção/i })).toBeVisible();
  });

  test("gera o PDF do Termo de Opção após preencher o formulário", async ({ page }) => {
    await page.getByLabel("Categoria funcional").fill("Fiscal de Contratos");
    await page.getByLabel("Marca").fill("Chevrolet");
    await page.getByLabel("Modelo").fill("Onix");
    await page.getByLabel("Placa").fill("QAV-2026");
    await page.getByRole("button", { name: /gerar termo de opção/i }).click();

    await expect(page.getByText("Baixe o Termo de Opção gerado")).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar termo assinado/i })).toBeDisabled();
  });

  test("envia o termo assinado (upload no Storage) e cria o registro pendente", async ({ page }) => {
    await page.getByLabel("Categoria funcional").fill("Fiscal de Contratos");
    await page.getByLabel("Marca").fill("Chevrolet");
    await page.getByLabel("Modelo").fill("Onix");
    await page.getByLabel("Placa").fill("QAV-2026");
    await page.getByRole("button", { name: /gerar termo de opção/i }).click();

    await page.locator('input[type="file"]').setInputFiles({
      name: "termo-assinado.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 conteudo de teste"),
    });

    await expect(page.getByRole("button", { name: /enviar termo assinado/i })).toBeEnabled();
    await page.getByRole("button", { name: /enviar termo assinado/i }).click();

    // Após o envio, o componente recarrega e passa a exibir o card do registro recém-criado
    // (o aviso "Termo enviado!" só aparece na tela intermediária, some assim que o card renderiza).
    await expect(page.getByText("Chevrolet Onix — QAV-2026")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Aguardando aprovação", { exact: true })).toBeVisible();
    await expect(page.getByText("Ver termo assinado")).toBeVisible();
  });
});
