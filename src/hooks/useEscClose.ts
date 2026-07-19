import { useEffect } from "react";

/**
 * Fecha um modal/diálogo ao pressionar Esc.
 * Passar `ativo=false` quando o modal está fechado para não registrar o listener à toa.
 */
export function useEscClose(onClose: () => void, ativo = true) {
  useEffect(() => {
    if (!ativo) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, ativo]);
}
