import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);

/**
 * Registra o service worker — é o que torna o Hub instalável na tela inicial e,
 * mais adiante, permite receber aviso com o app fechado.
 *
 * Só em produção: em desenvolvimento e nos testes e2e um SW ativo atrapalha o
 * hot reload e pode servir versão antiga.
 *
 * O SW não faz cache de nada (ver comentário em public/sw.js) — cache aqui
 * reintroduziria o problema de chunk desatualizado já corrigido.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(e => {
      console.warn("Service worker não registrado (o app funciona normalmente):", e);
    });
  });
}
