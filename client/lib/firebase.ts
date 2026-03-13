import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-VasuLqN3OTKtQUfLR4XSWORXbV5TUgc",
  authDomain: "hashhustlers-2d8dd.firebaseapp.com",
  projectId: "hashhustlers-2d8dd",
  storageBucket: "hashhustlers-2d8dd.firebasestorage.app",
  messagingSenderId: "245339256399",
  appId: "1:245339256399:web:7981fad162bbe3c367dc3a"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
