import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAZB67tYG44LkZkf3PCKxhTgKCmxS-sIa8",
  authDomain: "gestaofrotacge530101.firebaseapp.com",
  projectId: "gestaofrotacge530101",
  storageBucket: "gestaofrotacge530101.firebasestorage.app",
  messagingSenderId: "668503168024",
  appId: "1:668503168024:web:2d090da6ea4116a8415f6d",
};

const app = initializeApp(firebaseConfig);

// App Check (reCAPTCHA v3, faixa gratuita) — protege o Firestore contra abuso, em
// especial o formulário público de solicitação de acesso. Só inicializa quando a chave
// está definida (build de produção via secret VITE_RECAPTCHA_SITE_KEY); em dev e nos
// testes e2e (Firebase mockado, sem a chave) fica desligado, sem quebrar nada.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
