import { Sidebar } from "../../components/layout/Sidebar";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { SkeletonLista } from "../../components/Skeleton";

interface Setor { id: string; nome: string; ativo: boolean; }

export default function Setores() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nomeNovo, setNomeNovo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const snap = await getDocs(collection(db, "setores"));
    setSetores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Setor)).sort((a, b) => a.nome.localeCompare(b.nome)));
    setCarregando(false);
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const nome = nomeNovo.trim();
    if (!nome) return;
    if (setores.some(s => s.nome.toLowerCase() === nome.toLowerCase())) { setErro("Esse setor já está cadastrado."); return; }
    setSalvando(true);
    try {
      await addDoc(collection(db, "setores"), { nome, ativo: true });
      setNomeNovo("");
      await carregar();
    } catch (err) { console.error(err); setErro("Erro ao cadastrar. Tente novamente."); }
    finally { setSalvando(false); }
  }

  async function toggleAtivo(s: Setor) {
    await updateDoc(doc(db, "setores", s.id), { ativo: !s.ativo });
    await carregar();
  }

  return (
    <div style={s.page}>
      <Sidebar perfil="gestor" />
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Setores</div>
            <div style={s.sub}>Catálogo de setores da CGE-MS usado nos cadastros de usuário</div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto", maxWidth: 640 }}>
          <div style={s.card}>
            <form onSubmit={cadastrar} style={{ display: "flex", gap: 8, marginBottom: erro ? 8 : 16 }}>
              <input type="text" aria-label="Nome do setor" placeholder="Nome do setor" value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} style={{ ...s.input, flex: 1 }} />
              <button type="submit" disabled={salvando} style={s.btnPrimario}>{salvando ? "Salvando..." : "+ Adicionar"}</button>
            </form>
            {erro && <div role="alert" style={{ ...s.erro, marginBottom: 16 }}>{erro}</div>}

            {carregando ? (
              <SkeletonLista itens={3} />
            ) : setores.length === 0 ? (
              <div style={s.vazio}>Nenhum setor cadastrado ainda.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {setores.map(st => (
                  <div key={st.id} style={s.linha}>
                    <span style={{ fontSize: 13, color: st.ativo ? "#0F172A" : "#94A3B8", textDecoration: st.ativo ? "none" : "line-through" }}>{st.nome}</span>
                    <button onClick={() => toggleAtivo(st)} style={st.ativo ? s.btnDesativar : s.btnReativar}>
                      {st.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { display: "flex", minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', system-ui, sans-serif" },
  main:    { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" },
  topbar:  { background: "#ffffff", borderBottom: "1.5px solid #E1EAF5", padding: "14px 24px", flexShrink: 0 },
  title:   { fontSize: 18, fontWeight: 700, color: "#0F172A" },
  sub:     { color: "#7A95B2", fontSize: 12, marginTop: 2 },
  card:    { background: "#ffffff", border: "1px solid #E1EAF5", borderRadius: 12, padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  vazio:   { fontSize: 13, color: "#94A3B8" },
  input:   { padding: "9px 12px", border: "1px solid #E1EAF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", color: "#0F172A", fontFamily: "inherit" },
  erro:    { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", fontWeight: 500 },
  btnPrimario: { padding: "9px 18px", border: "none", borderRadius: 8, background: "#1E3A8A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  linha:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px", borderBottom: "1px solid #F1F5F9" },
  btnDesativar: { padding: "4px 10px", border: "1px solid #fecaca", borderRadius: 6, background: "#fff5f5", color: "#991b1b", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  btnReativar:  { padding: "4px 10px", border: "1px solid #bbf7d0", borderRadius: 6, background: "#f0fdf4", color: "#166534", fontSize: 11, fontWeight: 600, cursor: "pointer" },
};
