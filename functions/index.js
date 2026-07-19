const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

// Mantém o custom claim "perfil" do token de Auth sincronizado com usuarios/{uid}.perfil,
// pra storage.rules poder checar request.auth.token.perfil sem chamada cross-service ao Firestore
// (a chamada firestore.get() dentro de storage.rules não estava resolvendo em produção — ver PLANO.md).
exports.syncPerfilClaim = onDocumentWritten("usuarios/{uid}", async (event) => {
  const uid = event.params.uid;
  const perfil = event.data?.after?.data()?.perfil ?? null;
  await getAuth().setCustomUserClaims(uid, perfil ? { perfil } : null);
});
