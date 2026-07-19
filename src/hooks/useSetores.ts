import { useEffect, useState } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../firebase/config";

interface Setor { id: string; nome: string; ativo: boolean; }

export function useSetores() {
  const [setores, setSetores] = useState<Setor[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, "setores"), limit(200))).then(snap => {
      setSetores(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Setor))
          .filter(s => s.ativo)
          .sort((a, b) => a.nome.localeCompare(b.nome))
      );
    }).catch(() => { /* lista de setores é auxiliar (dropdown) — falha aqui não deve quebrar a tela */ });
  }, []);

  return setores;
}
