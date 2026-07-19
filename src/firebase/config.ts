import { initializeApp } from "firebase/app";
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
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
