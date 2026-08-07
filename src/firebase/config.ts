import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyAZB67tYG44LkZkf3PCKxhTgKCmxS-sIa8",
  authDomain: "gestaofrotacge530101.firebaseapp.com",
  projectId: "gestaofrotacge530101",
  storageBucket: "gestaofrotacge530101.firebasestorage.app",
  messagingSenderId: "668503168024",
  appId: "1:668503168024:web:2d090da6ea4116a8415f6d",
};

const app = initializeApp(firebaseConfig);

// App Check (reCAPTCHA v3, faixa gratuita) — protege o Firestore contra abuso, em
// especial o formulário público de solicitação de acesso. Só inicializa no build de
// PRODUÇÃO com a chave definida (secret VITE_RECAPTCHA_SITE_KEY). A checagem de
// `import.meta.env.PROD` é essencial: o servidor de e2e (Playwright) roda em modo dev
// e agora enxerga a chave do secret no CI — sem esse guard, o App Check tentaria atestar
// contra localhost e quebraria a renderização nos testes.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (import.meta.env.PROD && recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Idioma dos e-mails automáticos do Firebase Auth (definir senha, recuperar senha,
// verificar e-mail). SEM isto o Firebase serve o template padrão EM INGLÊS — era o
// primeiro contato do servidor com o sistema, num órgão público estadual, chegando
// em outra língua. `languageCode` faz o Firebase usar a versão pt-BR do template.
// Para trocar o TEXTO em si (assinatura institucional, remetente), é preciso editar
// o template em Firebase Console → Authentication → Templates.
auth.languageCode = "pt-BR";
