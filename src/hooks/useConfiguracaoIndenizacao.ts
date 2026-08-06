import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { VALOR_KM_PADRAO } from "../utils/pdfIndenizacao";

export function useConfiguracaoIndenizacao() {
  const [valorPorKm, setValorPorKm] = useState(VALOR_KM_PADRAO);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    getDoc(doc(db, "configuracoes", "indenizacao"))
      .then(snap => {
        const valor = snap.data()?.valorPorKm;
        if (typeof valor === "number" && valor > 0) setValorPorKm(valor);
      })
      // Doc de config é auxiliar: se a leitura falhar, segue com o valor padrão
      // do código em vez de travar a tela de indenização.
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  return { valorPorKm, carregando };
}
