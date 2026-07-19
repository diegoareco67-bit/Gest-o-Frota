import { useNavigate } from "react-router-dom";

export default function Privacidade() {
  const navigate = useNavigate();
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "50%", background: "#dbeafe", marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <h1 style={s.titulo}>Aviso de Privacidade</h1>
          <p style={{ fontSize: 12, color: "#7A95B2", margin: 0 }}>Hub — Central de Recursos Compartilhados · CGE-MS</p>
        </div>

        <Secao titulo="Controlador dos dados">
          O tratamento dos dados pessoais neste sistema é realizado pela <strong>Controladoria-Geral do Estado
          de Mato Grosso do Sul (CGE-MS)</strong>, na qualidade de controladora, nos termos da Lei nº 13.709/2018
          (LGPD) e do Decreto Estadual nº 15.572/2020.
        </Secao>

        <Secao titulo="Finalidade do tratamento">
          Os dados são tratados exclusivamente para a gestão de recursos compartilhados do órgão: solicitação e
          uso de veículos oficiais, reserva de salas e equipamentos, e processamento de indenização de transporte
          por uso de veículo próprio a serviço (Decreto Estadual nº 10.154/2000). Não há uso para finalidade
          diversa da execução dessas competências públicas.
        </Secao>

        <Secao titulo="Base legal">
          O tratamento fundamenta-se na execução de políticas públicas e no exercício de competência legal pela
          Administração Pública (art. 7º, III, e art. 23 da LGPD), dispensando o consentimento do titular quando
          necessário ao cumprimento da atribuição legal do órgão.
        </Secao>

        <Secao titulo="Dados tratados">
          Dados de identificação (nome, e-mail institucional, matrícula, setor), de habilitação (número e
          vencimento da CNH, quando aplicável), de deslocamento (destino, motivo, datas) e, no módulo de
          indenização, dados do veículo particular e valores calculados. Os calendários de disponibilidade
          exibidos publicamente contêm apenas dados não sensíveis (recurso, datas e situação) — nunca nome,
          motivo ou destino.
        </Secao>

        <Secao titulo="Compartilhamento">
          O boletim de indenização de transporte, quando enviado, é encaminhado internamente ao setor responsável
          (RH/Contabilidade da CGE-MS) para processamento do reembolso. Não há compartilhamento com terceiros
          externos ao órgão.
        </Secao>

        <Secao titulo="Retenção e anonimização">
          Os dados são mantidos pelo tempo necessário ao cumprimento das finalidades acima e às
          obrigações de prestação de contas do órgão. Como parâmetros de referência (a serem
          confirmados pela gestão documental do órgão, conforme a tabela de temporalidade
          aplicável): registros de solicitação/uso de veículos, reservas de salas e equipamentos
          por até 5 anos; boletins de indenização de transporte pelo prazo da legislação de
          prestação de contas; contas de usuário podem ter seus dados pessoais anonimizados após
          período de inatividade. A trilha de auditoria é mantida de forma imutável para fins de
          rastreabilidade. Encerrado o prazo, os dados pessoais são anonimizados, preservando-se
          apenas registros não identificáveis quando exigidos por lei.
        </Secao>

        <Secao titulo="Direitos do titular">
          O titular pode solicitar informação sobre o tratamento, acesso, correção de dados incompletos ou
          desatualizados, e demais direitos previstos no art. 18 da LGPD, mediante contato com o Encarregado pelo
          Tratamento de Dados Pessoais (DPO) da CGE-MS pelos canais oficiais do órgão.
        </Secao>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
          <button onClick={() => navigate(-1)} style={s.btn}>← Voltar</button>
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={s.secao}>
      <div style={s.secaoTitulo}>{titulo}</div>
      <p style={s.secaoTexto}>{children}</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F1F5F9", padding: "2rem 1rem", fontFamily: "'Sora', system-ui, sans-serif" },
  card:        { background: "#ffffff", borderRadius: 16, border: "1px solid #E1EAF5", padding: "2rem", width: "100%", maxWidth: 640, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  titulo:      { fontSize: 22, fontWeight: 700, color: "#0F172A", margin: "0 0 6px" },
  secao:       { background: "#F8FAFC", border: "1px solid #E1EAF5", borderRadius: 10, padding: "1rem 1.15rem", marginBottom: "0.85rem" },
  secaoTitulo: { fontSize: 13, fontWeight: 700, color: "#1E3A8A", marginBottom: 6 },
  secaoTexto:  { fontSize: 13.5, color: "#334155", lineHeight: 1.6, margin: 0 },
  btn:         { padding: "10px 24px", background: "#1E3A8A", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
};
