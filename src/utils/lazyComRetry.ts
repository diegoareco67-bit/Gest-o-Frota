import { lazy, type ComponentType } from "react";

/**
 * `React.lazy` que se recupera de chunk desaparecido após um deploy.
 *
 * O problema: com code-splitting por rota, cada tela é um arquivo com hash no nome.
 * Quando um deploy novo entra, os arquivos antigos deixam de existir. Quem estava com
 * o app ABERTO continua com o mapa antigo em memória e, ao navegar, pede um arquivo
 * que já não existe — "Failed to fetch dynamically imported module". A tela fica em
 * branco e o usuário só sai disso recarregando na mão.
 *
 * A correção de cache no `firebase.json` (index.html com no-cache) resolve para quem
 * abre a página depois do deploy. Isto aqui cobre quem já estava dentro.
 *
 * Estratégia: uma tentativa a mais (pode ser rede instável) e, persistindo, recarregar
 * a página uma única vez para buscar o index.html novo. A trava em `sessionStorage`
 * impede laço infinito caso o erro seja outro.
 */

const CHAVE_RECARGA = "hub:recarga-por-chunk";

export function lazyComRetry<T extends ComponentType<unknown>>(
  importar: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const modulo = await importar();
      // Chegou aqui: o app está íntegro, libera uma futura recarga se precisar
      sessionStorage.removeItem(CHAVE_RECARGA);
      return modulo;
    } catch (erro) {
      // Segunda tentativa — cobre falha transitória de rede
      try {
        const modulo = await importar();
        sessionStorage.removeItem(CHAVE_RECARGA);
        return modulo;
      } catch {
        const jaRecarregou = sessionStorage.getItem(CHAVE_RECARGA) === "1";
        if (!jaRecarregou) {
          sessionStorage.setItem(CHAVE_RECARGA, "1");
          console.warn("Versão nova detectada (chunk ausente). Recarregando a página...", erro);
          window.location.reload();
          // Promise que nunca resolve: a página está sendo recarregada
          return new Promise<never>(() => {});
        }
        // Já tentou recarregar e falhou de novo — deixa o ErrorBoundary assumir
        throw erro;
      }
    }
  });
}
