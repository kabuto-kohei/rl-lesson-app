// src/firebaseMessaging.ts
import { firebaseApp, db } from "@/firebase";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, setDoc, arrayUnion } from "firebase/firestore";

/**
 * ブラウザが Push/Messaging に対応しているか判定
 */
export const initMessaging = async () => {
  const supported = await isSupported();
  if (!supported) {
    console.log("このブラウザは Push 通知に対応していません");
    return null;
  }
  const messaging = getMessaging(firebaseApp);
  return messaging;
};

/**
 * 通知許可をリクエストして、FCM トークンを users/{userId} に保存
 */
export const requestNotificationPermissionAndSaveToken = async (userId: string) => {
  try {
    // SSRガード
    if (typeof window === "undefined") {
      return;
    }

    // Service Worker 対応チェック
    if (!("serviceWorker" in navigator)) {
      console.log("このブラウザは Service Worker に対応していません");
      return;
    }

    const messaging = await initMessaging();
    if (!messaging) return;

    // 先に SW を明示的に登録する
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    console.log("Service worker registered:", registration);

    // ブラウザに通知許可をリクエスト
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("通知が許可されませんでした");
      return;
    }

    const vapidKey =
      "BKRvJr-3x92s7CPwX2fu6uQMHkSHR-pRb82LIChYaiaOEn_ZKCY8s_OJ1VUa6qMAdYp7Yq2wd9J1Eq63MZhocYQ";

    // ★ 明示的に登録済み SW を渡す
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.log("FCM トークンを取得できませんでした");
      return;
    }

    console.log("FCM token:", token);

    // users/{userId} に notificationTokens 配列として保存（なければ作る）
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        notificationTokens: arrayUnion(token),
      },
      { merge: true }
    );

    console.log("トークンを Firestore に保存しました");
    alert("スクール予約の通知を受け取る設定が完了しました！");
  } catch (error) {
    console.error("通知設定中にエラーが発生しました:", error);
    alert("通知の設定中にエラーが発生しました。時間をおいて再度お試しください。");
  }
};
