type DocRef = { colecao: string; id: string };
type FilterClause = { campo: string; op: string; valor: unknown };
type MockDoc = { id: string; data: Record<string, unknown> };

/** Data ISO local daqui a N dias — evita seed com data fixa que vence. */
function dataFutura(dias: number, hora: string): string {
  const d = new Date(Date.now() + dias * 24 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${hora}`;
}

// Dados reinicializados a cada carregamento de módulo (cada page.goto reinicia o estado)
const store: Record<string, MockDoc[]> = {
  usuarios: [
    { id: "uid-usuario-teste",  data: { nome: "João Usuário",    perfil: "usuario",  setor: "TI",       matricula: "12345", ativo: true } },
    { id: "uid-gestor-teste",   data: { nome: "Maria Gestora",   perfil: "gestor",   setor: "Gestão",   matricula: "67890", ativo: true } },
    { id: "uid-consulta-teste", data: { nome: "Carlos Consulta", perfil: "consulta", setor: "Auditoria", matricula: "11223", ativo: true } },
    { id: "uid-outro-servidor", data: { nome: "Pedro Motorista",  perfil: "usuario",  setor: "Transportes", matricula: "22334", ativo: true } },
    { id: "uid-auditor-teste",  data: { nome: "Ana Auditora",     perfil: "auditor",  setor: "Controle Interno", matricula: "33445", ativo: true } },
    { id: "uid-admin-teste",    data: { nome: "Sandra Administrativo", perfil: "administrativo", setor: "Superintendência de Administração", matricula: "55667", ativo: true } },
    { id: "uid-terceiro-servidor", data: { nome: "Lucia Servidora", perfil: "usuario", setor: "Transportes", matricula: "44556", ativo: true } },
  ],
  veiculos: [
    { id: "veiculo-001", data: { placa: "ABC-1234", modelo: "Strada",  marca: "Fiat",    ano: 2022, tipo: "caminhonete", cor: "Branco", status: "disponivel", kmAtual: 45000 } },
    { id: "veiculo-002", data: { placa: "XYZ-5678", modelo: "Sandero", marca: "Renault", ano: 2021, tipo: "carro",       cor: "Prata",  status: "em_uso",     kmAtual: 32000 } },
  ],
  solicitacoes: [
    { id: "sol-001", data: { protocolo: "SOL001", condutorNome: "João Usuário", condutorId: "uid-usuario-teste", veiculoPlaca: "ABC-1234", destino: "Hospital Municipal",     motivo: "Transporte de pacientes", dataSaida: "2025-01-20T08:00", dataRetorno: "2025-01-20T17:00", status: "pendente" } },
    { id: "sol-002", data: { protocolo: "SOL002", condutorNome: "João Usuário", condutorId: "uid-usuario-teste", veiculoPlaca: "XYZ-5678", destino: "Secretaria de Educação", motivo: "Reunião de equipe",      dataSaida: "2025-01-18T09:00", dataRetorno: "2025-01-18T12:00", status: "aprovada" } },
  ],
  manutencoes: [
    { id: "man-001", data: { veiculoId: "veiculo-001", veiculoPlaca: "ABC-1234", tipo: "revisao", descricao: "Revisão periódica dos 45.000 km", status: "agendada",  previsao: "2025-02-10", custo: 500,  oficina: "Oficina Central" } },
    { id: "man-002", data: { veiculoId: "veiculo-002", veiculoPlaca: "XYZ-5678", tipo: "reparo",  descricao: "Troca de pastilhas de freio",    status: "concluida", previsao: "2025-01-15", custo: 1200, oficina: "Auto Mecânica Norte" } },
  ],
  setores: [
    { id: "setor-001", data: { nome: "TI", ativo: true } },
    { id: "setor-002", data: { nome: "Secretaria de Obras", ativo: true } },
    { id: "setor-003", data: { nome: "Gestão", ativo: true } },
  ],
  salas: [
    { id: "sala-001", data: { nome: "Sala de Reunião AGE", capacidade: 15, localizacao: "2º andar", equipamentos: "Projetor, TV Smart", ativo: true } },
    { id: "sala-002", data: { nome: "Sala de Treinamento", capacidade: 20, localizacao: "3º andar", equipamentos: "", ativo: true } },
  ],
  // Reserva futura fixa: o calendário só enxerga o que já estava no store no
  // carregamento (o mock reinicia a cada page.goto), então uma reserva criada
  // durante o teste nunca apareceria na grade. Data calculada em runtime para
  // não vencer.
  reservasSalas: [
    { id: "reserva-seed", data: {
      salaId: "sala-001", salaNome: "Sala de Reunião AGE",
      responsavelId: "uid-usuario-teste", responsavelNome: "João Usuário", responsavelSetor: "TI",
      motivo: "Alinhamento do plano de auditoria",
      dataInicio: dataFutura(3, "09:00"), dataFim: dataFutura(3, "11:00"),
      status: "confirmada",
    } },
  ],
  equipamentos: [
    { id: "equip-001", data: { nome: "Notebook Dell Latitude", tipo: "Notebook", patrimonio: "100234", status: "disponivel", ativo: true } },
  ],
  emprestimosEquipamentos: [],
  veiculosProprios: [
    { id: "vp-001", data: { servidorId: "uid-usuario-teste", servidorNome: "João Usuário", categoriaFuncional: "Analista", marca: "Fiat", modelo: "Strada", placa: "TST-0001", localidade: "Campo Grande", data: "2025-01-01T00:00:00.000Z", status: "aprovado", pdfUrl: "https://example.com/termo.pdf", pdfHash: "hash-teste" } },
    { id: "vp-002", data: { servidorId: "uid-outro-servidor", servidorNome: "Pedro Motorista", categoriaFuncional: "Motorista", marca: "Volkswagen", modelo: "Gol", placa: "TST-0002", localidade: "Campo Grande", data: "2025-02-01T00:00:00.000Z", status: "pendente", pdfUrl: "https://example.com/termo2.pdf", pdfHash: "hash-teste-2" } },
  ],
  solicitacoesAcesso: [
    { id: "solacesso-001", data: { nomeCompleto: "Roberto Candidato", email: "rcandidato@cge.ms.gov.br", matricula: "55667", setor: "Auditoria-Geral do Estado", numeroCnh: "01234567890", vencimentoCnh: "2028-05-10", numeroDiario: "10555", dataPublicacao: "2026-07-01", numeroResolucao: "RES-2026-42", status: "pendente" } },
  ],
  indenizacoes: [],
  configuracoes: [
    { id: "indenizacao", data: { valorPorKm: 0.8, atualizadoEm: mockTimestamp(new Date("2025-01-01T00:00:00")), atualizadoPor: "Maria Gestora" } },
  ],
  auditoria: [
    { id: "aud-001", data: { acao: "aprovar_solicitacao", usuarioId: "uid-gestor-teste", usuarioNome: "Maria Gestora", detalhes: { protocolo: "SOL001", veiculoPlaca: "ABC-1234" }, criadoEm: mockTimestamp(new Date("2025-01-20T10:00:00")) } },
    { id: "aud-002", data: { acao: "checkout", usuarioId: "uid-usuario-teste", usuarioNome: "João Usuário", detalhes: { veiculoPlaca: "ABC-1234", kmSaida: 45000 }, criadoEm: mockTimestamp(new Date("2025-01-20T11:00:00")) } },
  ],
};

function getColName(ref: unknown): string {
  const r = ref as Record<string, unknown>;
  if ("nome" in r) return r.nome as string;
  if ("ref" in r) return getColName(r.ref);
  return "";
}

function getFilters(ref: unknown): FilterClause[] {
  const r = ref as Record<string, unknown>;
  if (!("filtros" in r)) return [];
  const raw = (r.filtros as unknown[]).filter(f => {
    const fo = f as Record<string, unknown>;
    return fo && "campo" in fo && "op" in fo && "valor" in fo;
  }) as FilterClause[];
  const parent = "ref" in r ? getFilters(r.ref) : [];
  return [...parent, ...raw];
}

export function getFirestore() { return {}; }

export function doc(_db: unknown, colecao: string, id: string): DocRef {
  return { colecao, id };
}

export function collection(_db: unknown, nome: string) {
  return { nome };
}

export function query(ref: unknown, ...args: unknown[]) {
  return { ref, filtros: args };
}

export function where(campo: string, op: string, valor: unknown) {
  return { campo, op, valor };
}

export function orderBy(campo: string, direcao?: string) {
  return { campo, direcao };
}

export function limit(n: number) {
  return { limite: n };
}

export function getDoc(ref: DocRef) {
  const docs = store[ref.colecao] ?? [];
  const found = docs.find(d => d.id === ref.id);
  return Promise.resolve({
    exists: () => !!found,
    data: () => ({ ...(found?.data ?? {}) }),
    id: ref.id,
  });
}

function resolverSnapshot(ref: unknown) {
  const nome = getColName(ref);
  const filtros = getFilters(ref);
  let docs = [...(store[nome] ?? [])];

  for (const f of filtros) {
    if (f.op === "==") docs = docs.filter(d => d.data[f.campo] === f.valor);
    if (f.op === "in") docs = docs.filter(d => (f.valor as unknown[]).includes(d.data[f.campo]));
  }

  const mockDocs = docs.map(d => ({
    id: d.id,
    data: () => ({ ...d.data }),
    exists: () => true,
  }));

  return {
    docs: mockDocs,
    forEach: (fn: (d: unknown) => void) => mockDocs.forEach(fn),
    size: mockDocs.length,
    empty: mockDocs.length === 0,
  };
}

export function getDocs(ref: unknown) {
  return Promise.resolve(resolverSnapshot(ref));
}

export function onSnapshot(ref: unknown, callback: (snap: ReturnType<typeof resolverSnapshot>) => void) {
  setTimeout(() => callback(resolverSnapshot(ref)), 0);
  return () => {};
}

export function updateDoc(ref: DocRef, data: Record<string, unknown>) {
  const docs = store[ref.colecao];
  if (docs) {
    const idx = docs.findIndex(d => d.id === ref.id);
    if (idx >= 0) docs[idx].data = { ...docs[idx].data, ...data };
  }
  return Promise.resolve();
}

export function addDoc(ref: { nome: string }, data: Record<string, unknown>) {
  const id = "doc-" + Math.random().toString(36).slice(2, 10);
  if (!store[ref.nome]) store[ref.nome] = [];
  store[ref.nome].push({ id, data: { ...data } });
  return Promise.resolve({ id });
}

export function setDoc(ref: DocRef, data: Record<string, unknown>, opcoes?: { merge?: boolean }) {
  if (!store[ref.colecao]) store[ref.colecao] = [];
  const docs = store[ref.colecao];
  const idx = docs.findIndex(d => d.id === ref.id);
  if (idx >= 0) docs[idx].data = opcoes?.merge ? { ...docs[idx].data, ...data } : { ...data };
  else docs.push({ id: ref.id, data: { ...data } });
  return Promise.resolve();
}

export function deleteDoc(ref: DocRef) {
  const docs = store[ref.colecao];
  if (docs) {
    const idx = docs.findIndex(d => d.id === ref.id);
    if (idx >= 0) docs.splice(idx, 1);
  }
  return Promise.resolve();
}

function mockTimestamp(d: Date) {
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
}

export function serverTimestamp() { return mockTimestamp(new Date()); }

export const Timestamp = { fromDate: mockTimestamp, now: () => mockTimestamp(new Date()) };
