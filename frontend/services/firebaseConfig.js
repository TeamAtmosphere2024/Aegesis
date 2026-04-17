import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Aegesis Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2Vbn5pQisQFKf2lYh60W-LPqkX9TIlSY",
  authDomain: "agesis-59272.firebaseapp.com",
  projectId: "agesis-59272",
  storageBucket: "agesis-59272.firebasestorage.app",
  messagingSenderId: "239448477137",
  appId: "1:239448477137:web:addfad7f0a5b9f1e8764f0",
  measurementId: "G-3VJ33RRDQK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
