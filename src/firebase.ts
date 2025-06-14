// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1ZIG-0BCghpsjYVIuMUi0RrmMUtsm7rg",
  authDomain: "rllesson-app.firebaseapp.com",
  projectId: "rllesson-app",
  storageBucket: "rllesson-app.firebasestorage.app",
  messagingSenderId: "645336729788",
  appId: "1:645336729788:web:4b1508d5104f22a6b1e8b9"
};

// Initialize Firebase App（すでに初期化されているか確認）
const app = initializeApp(firebaseConfig);

// Firestoreを使えるようにする
export const db = getFirestore(app);
