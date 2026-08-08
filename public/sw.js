/*
 * Service worker do Hub — requisito para o app ser instalável na tela inicial
 * (Android e iOS 16.4+), o que habilita a notificação com o app fechado.
 *
 * DELIBERADAMENTE NÃO FAZ CACHE DE NADA.
 *
 * O motivo: o sistema já sofreu com "Failed to fetch dynamically imported module"
 * porque o index.html vinha cacheado e apontava para chunks de um deploy anterior
 * (ver PLANO.md, correção 13). Um service worker com cache agressivo reintroduziria
 * o mesmo problema, de forma ainda mais difícil de limpar. Aqui ele existe só para
 * viabilizar a instalação e receber push.
 */

self.addEventListener("install", () => {
  // Assume o controle imediatamente, sem esperar abas antigas fecharem
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Sem handler de 'fetch': tudo vai direto para a rede, como se não houvesse SW.

/**
 * Push (Firebase Cloud Messaging) — o app fechado só recebe aviso por aqui.
 * A Cloud Function que dispara o push ainda não existe; quando existir, esta parte
 * já está pronta para receber.
 */
self.addEventListener("push", event => {
  if (!event.data) return;
  let dados = {};
  try { dados = event.data.json(); } catch { dados = { title: "Hub CGE-MS", body: event.data.text() }; }

  const titulo = dados.title || "Hub CGE-MS";
  const opcoes = {
    body: dados.body || "Há novidades aguardando no sistema.",
    icon: "/icone-192.png",
    badge: "/icone-192.png",
    lang: "pt-BR",
    data: { url: dados.url || "/" },
    tag: dados.tag || "hub-aviso",
  };
  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const destino = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(abas => {
      // Reaproveita uma aba já aberta em vez de abrir outra
      for (const aba of abas) {
        if ("focus" in aba) { aba.navigate(destino); return aba.focus(); }
      }
      return self.clients.openWindow(destino);
    })
  );
});
