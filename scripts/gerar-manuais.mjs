// Gera os 7 manuais de uso (um PDF por item de gestão) em public/manuais/.
// Rodar com: node scripts/gerar-manuais.mjs
// Reexecutar sempre que o texto abaixo ou a UI das telas de gestão mudar.
import { jsPDF } from "jspdf";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "manuais");
mkdirSync(OUT_DIR, { recursive: true });

const AZUL = [30, 58, 138];
const CINZA_TEXTO = [30, 41, 59];
const CINZA_CLARO = [243, 245, 248];

function cabecalho(doc, titulo) {
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CGE-MS — Controladoria-Geral do Estado de Mato Grosso do Sul", 14, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Hub — Central de Recursos Compartilhados · Manual de Uso", 14, 17);
  doc.setFontSize(8.5);
  doc.text(`Módulo: ${titulo}`, 14, 22.5);
  doc.setTextColor(0, 0, 0);
}

function rodape(doc) {
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(`Hub CGE-MS · Manual de Uso · Página ${p} de ${paginas}`, 14, 289);
    doc.setTextColor(0, 0, 0);
  }
}

function quebraSeNecessario(doc, y, altura = 10) {
  if (y > 275 - altura + 10) { doc.addPage(); return 32; }
  return y;
}

function tituloSecao(doc, texto, y) {
  y = quebraSeNecessario(doc, y, 13);
  doc.setFillColor(...CINZA_CLARO);
  doc.rect(14, y, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...AZUL);
  doc.text(texto, 17, y + 5.7);
  doc.setTextColor(0, 0, 0);
  return y + 13;
}

function paragrafo(doc, texto, y) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...CINZA_TEXTO);
  const linhas = doc.splitTextToSize(texto, 178);
  for (const linha of linhas) {
    y = quebraSeNecessario(doc, y);
    doc.text(linha, 14, y);
    y += 5.3;
  }
  doc.setTextColor(0, 0, 0);
  return y + 3;
}

function passos(doc, itens, y) {
  itens.forEach((item, i) => {
    const linhas = doc.splitTextToSize(item, 170);
    linhas.forEach((linha, li) => {
      y = quebraSeNecessario(doc, y);
      if (li === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...AZUL);
        doc.text(`${i + 1}.`, 14, y);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...CINZA_TEXTO);
      doc.text(linha, 21, y);
      y += 5.3;
    });
    y += 1.8;
  });
  doc.setTextColor(0, 0, 0);
  return y + 2;
}

function observacao(doc, texto, y) {
  y = quebraSeNecessario(doc, y, 16);
  const linhas = doc.splitTextToSize(texto, 168);
  const altura = linhas.length * 5.3 + 12;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(14, y, 182, altura, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text("Atenção", 18, y + 7);
  doc.setFont("helvetica", "normal");
  let ly = y + 13;
  for (const linha of linhas) {
    doc.text(linha, 18, ly);
    ly += 5.3;
  }
  doc.setTextColor(0, 0, 0);
  return y + altura + 5;
}

function gerarManual({ arquivo, titulo, objetivo, secoes }) {
  const doc = new jsPDF();
  cabecalho(doc, titulo);
  let y = 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, 14, y);
  y += 8;
  doc.setTextColor(0, 0, 0);
  y = paragrafo(doc, objetivo, y);
  y += 2;

  for (const s of secoes) {
    y = tituloSecao(doc, s.titulo, y);
    if (s.texto) y = paragrafo(doc, s.texto, y);
    if (s.passos) y = passos(doc, s.passos, y);
    if (s.aviso) y = observacao(doc, s.aviso, y);
  }

  rodape(doc);
  const buffer = doc.output("arraybuffer");
  writeFileSync(join(OUT_DIR, arquivo), Buffer.from(buffer));
  console.log("Gerado:", arquivo);
}

const MANUAIS = [
  {
    arquivo: "manual-veiculos.pdf",
    titulo: "Veículos",
    objetivo: "O módulo Veículos concentra o cadastro da frota oficial da CGE-MS: placa, modelo, marca, tipo, categoria de uso e status de disponibilidade de cada veículo. É a partir daqui que o gestor mantém a base usada por todos os outros módulos (Solicitações, Manutenção, Relatórios).",
    secoes: [
      {
        titulo: "Cadastrar um novo veículo",
        passos: [
          "Acesse Gestão > Veículos e clique no botão \"+ Novo Veículo\", no canto superior direito.",
          "Preencha Placa, Modelo e Marca (campos obrigatórios). Ano, Cor e KM Atual são opcionais.",
          "Selecione o Tipo (carro, caminhonete, moto, van, caminhão ou ônibus) e a Categoria de Uso (Administrativo, Representação, Operacional ou Misto).",
          "Defina o Status inicial — o normal é \"Disponível\" para um veículo recém-incorporado à frota.",
          "Clique em Salvar.",
        ],
      },
      {
        titulo: "Editar um veículo existente",
        passos: [
          "Localize o veículo na tabela (use a busca por placa/modelo/marca ou o filtro de status, se a lista for grande).",
          "Clique no botão Editar na linha correspondente.",
          "Altere os campos necessários e clique em Salvar.",
        ],
        aviso: "Os status \"Em Uso\" e \"Manutenção\" normalmente são atualizados automaticamente pelo próprio sistema — quando um condutor retira o veículo (Checkout) ou quando uma manutenção é agendada. Editar o status manualmente só é necessário em casos excepcionais (ex.: veículo temporariamente indisponível por motivo administrativo).",
      },
      {
        titulo: "Buscar e filtrar",
        texto: "O campo de busca no topo da lista pesquisa por placa, modelo ou marca ao mesmo tempo. O filtro ao lado restringe a lista por status: Disponível, Em Uso, Manutenção ou Indisponível.",
      },
    ],
  },
  {
    arquivo: "manual-salas.pdf",
    titulo: "Salas",
    objetivo: "O módulo Salas gerencia o cadastro de salas de reunião da CGE-MS e as reservas feitas por qualquer servidor com acesso ao sistema. As reservas são confirmadas automaticamente, sem fila de aprovação do gestor.",
    secoes: [
      {
        titulo: "Cadastrar uma nova sala",
        passos: [
          "Acesse Gestão > Salas. O card \"Salas cadastradas\" só aparece para o perfil Gestor.",
          "Clique em \"+ Nova sala\".",
          "Preencha Nome, Capacidade, Localização e, se houver, os Equipamentos disponíveis na sala (projetor, TV Smart etc.).",
          "Clique em Cadastrar.",
        ],
      },
      {
        titulo: "Reservar uma sala",
        passos: [
          "Clique em \"+ Nova Reserva\", no topo da tela.",
          "Selecione a sala, a data e o horário de início e fim, e informe o motivo da reserva.",
          "O sistema verifica automaticamente se já existe outra reserva confirmada para a mesma sala no mesmo horário e bloqueia o conflito.",
          "Clique em Confirmar Reserva.",
        ],
      },
      {
        titulo: "Consultar e cancelar reservas",
        texto: "O calendário no topo da tela mostra a disponibilidade das salas mês a mês. A lista \"Próximas reservas\", ao lado, mostra os agendamentos futuros. Como gestor, você pode cancelar qualquer reserva (não só as suas) clicando em Cancelar na respectiva linha.",
      },
    ],
  },
  {
    arquivo: "manual-equipamentos.pdf",
    titulo: "Equipamentos",
    objetivo: "O módulo Equipamentos controla o empréstimo de itens com número de patrimônio — notebooks, projetores, câmeras e afins. Cada equipamento é individual (não por tipo/quantidade) e segue um ciclo de reserva, retirada e devolução.",
    secoes: [
      {
        titulo: "Cadastrar um novo equipamento",
        passos: [
          "Acesse Gestão > Equipamentos.",
          "No card \"Catálogo\", clique em \"+ Novo equipamento\" (visível apenas para o perfil Gestor).",
          "Preencha Nome (ex.: \"Notebook Dell Latitude\"), Tipo (ex.: Notebook, Projetor, Câmera) e o Número de patrimônio.",
          "Clique em Cadastrar. O equipamento entra no catálogo com status \"Disponível\".",
        ],
      },
      {
        titulo: "Acompanhar o ciclo de empréstimo",
        texto: "Todo empréstimo passa por até três etapas, visíveis na lista \"Todos os empréstimos ativos\": Reservado > Retirado > Devolvido. Como gestor, você enxerga e pode agir sobre os empréstimos de qualquer servidor, não só os seus.",
        passos: [
          "Reservado: o servidor reservou o equipamento para um período futuro. Botão disponível: Retirar.",
          "Retirado: o equipamento já foi pego fisicamente. Botão disponível: Devolver.",
          "Uma reserva ainda não retirada pode ser cancelada a qualquer momento pelo botão Cancelar.",
        ],
      },
      {
        titulo: "Calendário de disponibilidade",
        texto: "O card com o calendário mostra as reservas e retiradas de equipamentos ao longo do mês, ajudando a identificar períodos de maior concorrência por um mesmo item.",
      },
    ],
  },
  {
    arquivo: "manual-manutencao.pdf",
    titulo: "Manutenção",
    objetivo: "O módulo Manutenção registra revisões, reparos e demais intervenções feitas nos veículos da frota, com custo estimado, oficina responsável e previsão de conclusão.",
    secoes: [
      {
        titulo: "Registrar uma nova manutenção",
        passos: [
          "Acesse Gestão > Manutenção e clique em \"+ Nova Manutenção\".",
          "Selecione o veículo e o tipo de manutenção (revisão preventiva, troca de pneus, troca de óleo, funilaria/pintura, elétrica, instalação de acessório, revisão corretiva ou outro).",
          "Preencha a Descrição (campo obrigatório).",
          "Defina o Status (Agendada, Em andamento, Concluída ou Cancelada), a Previsão de conclusão, a Oficina/Responsável e o Custo estimado.",
          "Clique em Salvar.",
        ],
        aviso: "Ao cadastrar uma manutenção com status \"Agendada\" ou \"Em andamento\", o veículo correspondente é automaticamente marcado como \"Manutenção\" na tela de Veículos, ficando indisponível para novas solicitações.",
      },
      {
        titulo: "Concluir uma manutenção",
        passos: [
          "Localize a manutenção na tabela (use a busca por placa/oficina/descrição ou o filtro de status).",
          "Clique no botão Concluir, disponível para manutenções que ainda não estão concluídas ou canceladas.",
          "O sistema marca a manutenção como \"Concluída\" e libera o veículo de volta para o status \"Disponível\" automaticamente.",
        ],
      },
    ],
  },
  {
    arquivo: "manual-usuarios.pdf",
    titulo: "Usuários",
    objetivo: "O módulo Usuários gerencia as contas de acesso ao sistema (perfis Usuário e Consulta) e as solicitações de cadastro enviadas pelo formulário público de acesso.",
    secoes: [
      {
        titulo: "Cadastrar um usuário manualmente",
        passos: [
          "Acesse Gestão > Usuários e clique em \"+ Novo Usuário\".",
          "Preencha Nome completo, E-mail institucional, Senha inicial e, se houver, a Matrícula.",
          "Selecione o Setor e o Perfil: Usuário (reserva veículos, salas e equipamentos) ou Consulta (só leitura, só enxerga os calendários).",
          "Clique em Cadastrar. O usuário já pode acessar o sistema com o e-mail e a senha informados.",
        ],
      },
      {
        titulo: "Analisar uma solicitação de acesso",
        texto: "Quando alguém preenche o formulário público \"Solicitar cadastro\", o pedido aparece na aba \"Solicitações de Acesso\", com a contagem de pendências destacada em vermelho.",
        passos: [
          "Clique no card da solicitação para abrir os detalhes.",
          "Revise (ou edite, se necessário) nome, e-mail, matrícula, setor, número e vencimento da CNH.",
          "Confira os dados de publicação no Diário Oficial (número do diário, data de publicação, número da resolução) informados pelo solicitante.",
          "Clique em \"Aprovar e Enviar Acesso\" para criar a conta — o novo usuário recebe um e-mail para definir a própria senha — ou em \"Recusar\" para negar o pedido.",
        ],
      },
      {
        titulo: "Ativar ou desativar uma conta",
        texto: "Cada card de usuário na aba \"Usuários\" tem um botão para Desativar (ou Reativar, se já estiver inativo). Desativar bloqueia o acesso ao sistema sem apagar o histórico do usuário.",
        aviso: "O card de cada usuário com CNH cadastrada mostra um aviso de vencimento quando a habilitação está vencida ou vence nos próximos 60 dias — vale acompanhar antes de aprovar solicitações de uso de veículo.",
      },
    ],
  },
  {
    arquivo: "manual-setores.pdf",
    titulo: "Setores",
    objetivo: "O módulo Setores mantém o catálogo de departamentos da CGE-MS usado como opção de seleção nos cadastros de usuário e no formulário público de solicitação de acesso.",
    secoes: [
      {
        titulo: "Cadastrar um setor",
        passos: [
          "Acesse Gestão > Setores.",
          "Digite o nome do setor no campo de texto no topo da tela.",
          "Clique em \"+ Adicionar\".",
        ],
        aviso: "O sistema não permite cadastrar dois setores com o mesmo nome (a comparação ignora maiúsculas/minúsculas).",
      },
      {
        titulo: "Ativar ou desativar um setor",
        texto: "Cada linha da lista tem um botão Desativar (ou Reativar). Um setor desativado aparece riscado na lista e deixa de estar disponível como opção nos formulários de cadastro — mas os usuários que já estavam vinculados a ele não são alterados, e o histórico é preservado.",
      },
    ],
  },
  {
    arquivo: "manual-indenizacoes.pdf",
    titulo: "Indenizações",
    objetivo: "O módulo Indenização de Transporte administra os pedidos de indenização por uso de veículo próprio a serviço, conforme o Decreto Estadual nº 10.154/2000: o Anexo I (Termo de Opção e Cadastramento de Veículo) e o Anexo II (Boletim Demonstrativo de Viagem e Homologação).",
    secoes: [
      {
        titulo: "Aba Veículos Próprios (Anexo I)",
        texto: "Antes de poder enviar boletins de viagem (Anexo II), o servidor precisa ter o Anexo I aprovado — o cadastro único do veículo particular que ele usará a serviço.",
        passos: [
          "Acesse Gestão > Indenizações > aba \"Veículos Próprios\".",
          "Os cadastros aguardando decisão aparecem na seção \"Aguardando aprovação\", com o nome do servidor, o veículo informado e um link \"Ver termo assinado\" para conferir o PDF enviado.",
          "Clique em \"Aprovar\" para liberar o Anexo II do servidor, ou em \"Recusar\" para negar o cadastro.",
        ],
        aviso: "Os cadastros já decididos (aprovados ou recusados) ficam listados na seção \"Já decididos\", abaixo, só para consulta — a decisão não pode ser desfeita por aqui.",
      },
      {
        titulo: "Aba Indenizações (Anexo II)",
        texto: "Lista os boletins de viagem enviados pelos servidores já com Anexo I aprovado, mais recentes primeiro. Cada card mostra o protocolo, o trajeto informado, a quilometragem total e o valor já calculado automaticamente (R$ 0,80 por km rodado).",
        passos: [
          "Acompanhe o status de cada boletim: \"Aguardando assinatura\", \"Enviada ao RH\" ou \"Enviada (confirmar e-mail)\".",
          "Clique em \"Ver boletim assinado\" para abrir o PDF enviado pelo servidor, se disponível.",
        ],
        aviso: "O envio do boletim para o RH/Contabilidade (suad@cge.ms.gov.br) acontece automaticamente pelo sistema assim que o servidor reenvia o PDF assinado — o gestor apenas acompanha o status aqui, não precisa reenviar nada manualmente.",
      },
    ],
  },
];

MANUAIS.forEach(gerarManual);
console.log(`\n${MANUAIS.length} manuais gerados em ${OUT_DIR}`);
