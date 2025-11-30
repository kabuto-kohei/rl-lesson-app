// public/firebase-messaging-sw.js
// eslint-disable no-undef //

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// ★ ここは firebase.ts と同じ設定でOK
firebase.initializeApp({
  apiKey: "AIzaSyD1ZIG-0BCghpsjYVIuMUi0RrmMUtsm7rg",
  authDomain: "rllesson-app.firebaseapp.com",
  projectId: "rllesson-app",
  storageBucket: "rllesson-app.firebasestorage.app",
  messagingSenderId: "645336729788",
  appId: "1:645336729788:web:4b1508d5104f22a6b1e8b9"
});

const messaging = firebase.messaging();

// バックグラウンドメッセージ受信時の処理
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);

  const notificationTitle = payload.notification?.title || "ROCKLANDS";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192x192.png", // PWAのアイコンがあれば
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
