import { jsPDF } from "jspdf";

const AZUL: [number, number, number] = [30, 58, 138];

// Valor de fallback quando o doc configuracoes/indenizacao não existe/não carrega.
// O valor real, editável pelo gestor sem precisar de deploy (tela Configurações),
// vem de configuracoes/indenizacao (ver useConfiguracaoIndenizacao). Decreto
// 10.154/2000, redação vigente do Decreto nº 12.606/2008 no momento em que este
// fallback foi fixado — se o decreto for reajustado de novo, o valor certo é
// atualizar configuracoes/indenizacao pela UI, não este número.
export const VALOR_KM_PADRAO = 0.8;

export async function calcularHashSHA256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function formatarData(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR");
}

function formatarDataHora(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function centenaPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
    else {
      const d = Math.floor(resto / 10), u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

function numeroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhar = Math.floor(n / 1000), resto = n % 1000;
  const partes: string[] = [];
  if (milhar > 0) partes.push(milhar === 1 ? "mil" : `${centenaPorExtenso(milhar)} mil`);
  if (resto > 0) partes.push(centenaPorExtenso(resto));
  return partes.join(resto > 0 && resto < 100 && milhar > 0 ? " e " : " ").trim();
}

export function valorPorExtenso(valor: number): string {
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  const reaisTxt = `${numeroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}`;
  if (centavos === 0) return reaisTxt;
  const centavosTxt = `${numeroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return `${reaisTxt} e ${centavosTxt}`;
}

function cabecalho(doc: jsPDF, titulo: string, subtitulo: string) {
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CGE-MS — Controladoria-Geral do Estado de Mato Grosso do Sul", 14, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(titulo, 14, 17);
  doc.setFontSize(8.5);
  doc.text(subtitulo, 14, 22.5);
  doc.setTextColor(0, 0, 0);
}

function rodape(doc: jsPDF, protocolo: string) {
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(`Documento gerado pelo Hub CGE-MS · Decreto Estadual nº 10.154, de 6 de dezembro de 2000 · Protocolo ${protocolo}`, 14, 289);
  doc.setTextColor(0, 0, 0);
}

function campo(doc: jsPDF, label: string, valor: string, x: number, y: number, largura = 182): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 100, 120);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text(valor || "—", x, y + 5.5);
  doc.setDrawColor(210);
  doc.line(x, y + 7.5, x + largura, y + 7.5);
  return y + 7.5;
}

function secao(doc: jsPDF, titulo: string, y: number): number {
  doc.setFillColor(243, 245, 248);
  doc.rect(14, y, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text(titulo, 16, y + 5);
  doc.setTextColor(0, 0, 0);
  return y + 13;
}

/**
 * Bloco de assinatura no formato do decreto: rótulo acima da linha, nome/cargo abaixo.
 *   (Assinatura do Servidor)
 *   ______________________________
 *   Nome do Servidor
 */
function blocoAssinatura(doc: jsPDF, rotulo: string, nome: string, x: number, y: number, largura = 110) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 100, 120);
  doc.text(rotulo, x, y);

  doc.setDrawColor(0);
  doc.line(x, y + 4, x + largura, y + 4);

  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(nome, x, y + 9);
}

function assinatura(doc: jsPDF, label: string, x: number, y: number, largura = 90) {
  doc.setDrawColor(0);
  doc.line(x, y, x + largura, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(label, x, y + 5);
}

// ─── Anexo I — Termo de Opção e Cadastramento de Veículo ─────────────────

export interface DadosAnexoI {
  protocolo: string;
  nomeServidor: string;
  categoriaFuncional: string;
  marca: string;
  modelo: string;
  placa: string;
  localidade: string;
  data: string;
}

export function gerarPdfAnexoI(d: DadosAnexoI): Blob {
  const doc = new jsPDF();
  cabecalho(doc, "ANEXO I — Decreto Estadual nº 10.154, de 6 de dezembro de 2000", "Termo de Opção e Cadastramento de Veículo");

  let y = 40;
  y = campo(doc, "Nome do servidor", d.nomeServidor, 14, y) + 10;
  y = campo(doc, "Categoria funcional", d.categoriaFuncional, 14, y) + 10;

  y = secao(doc, "Dados do veículo", y);
  campo(doc, "Marca", d.marca, 14, y, 55);
  campo(doc, "Modelo", d.modelo, 76, y, 55);
  campo(doc, "Placa", d.placa, 138, y, 58);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const declaracao = "Declaro optar pela utilização do veículo próprio acima descrito, nos deslocamentos para a execução de serviços externos, por força das atribuições de meu cargo/função. Declaro ainda estar de pleno acordo com o estabelecido no Decreto Estadual nº 10.154, de 6 de dezembro de 2000.";
  const linhas = doc.splitTextToSize(declaracao, 182);
  doc.text(linhas, 14, y);
  y += linhas.length * 5.2 + 14;

  doc.text(`${d.localidade || "Campo Grande"}, ${formatarData(d.data)}.`, 14, y);
  y += 24;

  // Blocos de assinatura no formato do Anexo I do Decreto nº 10.154/2000:
  // o rótulo "(Assinatura ...)" vem ACIMA da linha e o nome/cargo ABAIXO. O texto
  // anterior invertia isso, não imprimia os nomes e ainda acrescentava um parêntese
  // explicativo ("Secretário de Estado, Procurador-Geral ou Diretor-Presidente")
  // que não existe no decreto.
  blocoAssinatura(doc, "(Assinatura do Servidor)", d.nomeServidor || "Nome do Servidor", 14, y);
  y += 34;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("APROVADO EM ____ / ____ / ________", 14, y);
  y += 26;

  blocoAssinatura(doc, "(Assinatura da Autoridade Concedente)", "Nome/Cargo da Autoridade Concedente", 14, y);

  rodape(doc, d.protocolo);
  return doc.output("blob");
}

// ─── Anexo II — Boletim Demonstrativo de Viagem e Homologação ────────────

export interface TrajetoLinha {
  data: string;
  odometroInicial: string;
  trajetoPercorrido: string;
  kmRodados: string;
}

export interface DadosAnexoII {
  protocolo: string;
  nomeServidor: string;
  categoriaFuncional: string;
  veiculoPlaca: string;

  servicoARealizar: string;
  localidadesServico: string;
  inicioAutorizado: string;
  retornoPrevisto: string;
  odometroInicial: string;
  kmPreviamenteFixada?: string;

  trajetos: TrajetoLinha[];
  servicosRealizados: string;
  houveAlteracaoForcaMaior: boolean;
  justificativaAlteracao?: string;
  odometroFinal: string;
  totalKmRodados: number;
}

export function calcularValor(totalKmRodados: number, valorPorKm: number = VALOR_KM_PADRAO): number {
  return Math.round(totalKmRodados * valorPorKm * 100) / 100;
}

export function gerarPdfAnexoII(d: DadosAnexoII, valorPorKm: number = VALOR_KM_PADRAO): Blob {
  const doc = new jsPDF();
  const valor = calcularValor(d.totalKmRodados, valorPorKm);

  cabecalho(doc, "ANEXO II — Decreto Estadual nº 10.154, de 6 de dezembro de 2000", "Boletim Demonstrativo de Viagem e Homologação da Indenização de Despesas de Transporte");

  let y = 40;
  campo(doc, "Nome do servidor", d.nomeServidor, 14, y, 118);
  campo(doc, "Veículo (placa)", d.veiculoPlaca, 138, y, 58);
  y += 18;
  y = campo(doc, "Categoria funcional", d.categoriaFuncional, 14, y) + 10;

  y = secao(doc, "I — Determinação de Serviço Fora da Sede", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const servicoLinhas = doc.splitTextToSize(`Serviço a realizar: ${d.servicoARealizar}`, 182);
  doc.text(servicoLinhas, 14, y);
  y += servicoLinhas.length * 5 + 6;
  const localLinhas = doc.splitTextToSize(`Localidade(s): ${d.localidadesServico}`, 182);
  doc.text(localLinhas, 14, y);
  y += localLinhas.length * 5 + 8;

  campo(doc, "Início autorizado", formatarDataHora(d.inicioAutorizado), 14, y, 85);
  campo(doc, "Retorno previsto", formatarDataHora(d.retornoPrevisto), 108, y, 88);
  y += 16;
  campo(doc, "Odômetro inicial (km)", d.odometroInicial, 14, y, 85);
  campo(doc, "Km previamente fixada", d.kmPreviamenteFixada || "—", 108, y, 88);
  y += 18;

  if (y > 230) { doc.addPage(); y = 20; }
  y = secao(doc, "II — Relato do Responsável pelo Serviço", y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DATA", 14, y);
  doc.text("ODÔMETRO INICIAL", 44, y);
  doc.text("TRAJETO PERCORRIDO", 90, y);
  doc.text("KM RODADOS", 165, y);
  y += 3;
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const t of d.trajetos) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(formatarData(t.data), 14, y);
    doc.text(t.odometroInicial || "—", 44, y);
    doc.text(doc.splitTextToSize(t.trajetoPercorrido || "—", 68), 90, y);
    doc.text(t.kmRodados || "—", 165, y);
    y += 7;
  }
  y += 6;

  const realizadosLinhas = doc.splitTextToSize(`Serviços realizados: ${d.servicosRealizados}`, 182);
  doc.text(realizadosLinhas, 14, y);
  y += realizadosLinhas.length * 5 + 8;

  doc.text(`Alteração por força maior na previsão inicial: ${d.houveAlteracaoForcaMaior ? "SIM" : "NÃO"}`, 14, y);
  y += 6;
  if (d.houveAlteracaoForcaMaior && d.justificativaAlteracao) {
    const justLinhas = doc.splitTextToSize(`Justificativa: ${d.justificativaAlteracao}`, 182);
    doc.text(justLinhas, 14, y);
    y += justLinhas.length * 5 + 4;
  }
  y += 4;

  campo(doc, "Odômetro final (km)", d.odometroFinal, 14, y, 85);
  campo(doc, "Total de km rodados", String(d.totalKmRodados), 108, y, 88);
  y += 20;

  assinatura(doc, "Responsável pela execução do serviço", 14, y, 90);
  y += 26;

  if (y > 230) { doc.addPage(); y = 20; }
  y = secao(doc, "III — Homologação da Indenização de Despesas de Transporte", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const homologLinhas = doc.splitTextToSize("Ciente da co-responsabilidade acerca da veracidade das informações prestadas, homologo a concessão da Indenização de Despesa de Transporte, conforme a seguir:", 182);
  doc.text(homologLinhas, 14, y);
  y += homologLinhas.length * 5 + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${d.totalKmRodados} km × R$ ${valorPorKm.toFixed(2).replace(".", ",")} = R$ ${valor.toFixed(2).replace(".", ",")}`, 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const extensoLinhas = doc.splitTextToSize(`Valor por extenso: ${valorPorExtenso(valor)}.`, 182);
  doc.text(extensoLinhas, 14, y);
  y += extensoLinhas.length * 5 + 16;

  assinatura(doc, "Responsável pela homologação (carimbo e assinatura)", 14, y, 120);

  rodape(doc, d.protocolo);
  return doc.output("blob");
}
