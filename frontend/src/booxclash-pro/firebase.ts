import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, logEvent } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyBQ17HhEgiu-_RHpqK8SVHS2IkEsW9lG_Y",
  authDomain: "booxclashpro.firebaseapp.com",
  projectId: "booxclashpro",
  storageBucket: "booxclashpro.firebasestorage.app",
  messagingSenderId: "597317038286",
  appId: "1:597317038286:web:afcb84a492473673fe609f",
  measurementId: "G-X90XT4EB97"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null; // Handle SSR
export { logEvent };