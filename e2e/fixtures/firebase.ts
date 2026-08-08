import type { Page } from "@playwright/test";

export interface OpcoesMock {
  perfil: "usuario" | "gestor" | "administrativo" | "consulta" | "auditor";
  nome?: string;
  email?: string;
}

export interface DadosMock {
  email: string;
  nome: string;
  perfil: "usuario" | "gestor" | "administrativo" | "consulta" | "auditor";
}

export function gerarDados(opcoes: OpcoesMock): DadosMock {
  const { perfil } = opcoes;
  return {
    email: opcoes.email ?? (perfil === "gestor" ? "gestor@cge.ms.gov.br" : perfil === "administrativo" ? "administrativo@cge.ms.gov.br" : perfil === "consulta" ? "consulta@cge.ms.gov.br" : perfil === "auditor" ? "auditor@cge.ms.gov.br" : "usuario@cge.ms.gov.br"),
    nome:  opcoes.nome  ?? (perfil === "gestor" ? "Maria Gestora" : perfil === "administrativo" ? "Sandra Administrativo" : perfil === "consulta" ? "Carlos Consulta" : perfil === "auditor" ? "Ana Auditora" : "João Usuário"),
    perfil,
  };
}

export async function fazerLogin(page: Page, dados: DadosMock) {
  await page.goto("/login");
  await page.fill("#login-email", dados.email);
  await page.fill("#login-senha", "senha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`**/${dados.perfil}`, { timeout: 10000 });
}
