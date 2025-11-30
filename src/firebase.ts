// src/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1ZIG-0BCghpsjYVIuMUi0RrmMUtsm7rg",
  authDomain: "rllesson-app.firebaseapp.com",
  projectId: "rllesson-app",
  storageBucket: "rllesson-app.firebasestorage.app",
  messagingSenderId: "645336729788",
  appId: "1:645336729788:web:4b1508d5104f22a6b1e8b9"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// すでに使っている db はそのまま
export const db = getFirestore(app);

// Messaging 用に app も export しておく
export const firebaseApp = app;
