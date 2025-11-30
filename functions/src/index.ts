/**
 * Firebase Functions v2 用
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * lessonScheduleUpdates にイベントが積まれたら、
 * 対象スクール1件分の「日程が更新されました」通知を送る
 */
export const notifyLessonScheduleUpdated = onDocumentCreated(
  {
    document: "lessonScheduleUpdates/{updateId}",
    region: "asia-northeast1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No snapshot data");
      return;
    }

    // Admin側で追加した teacherId を受け取る
    const data = snap.data() as { teacherId?: string };
    const teacherId = data.teacherId;
    if (!teacherId) {
      console.log("teacherId がありません");
      return;
    }

    // ① teacherId コレクションから lessonName を取得（レオスク / ソラスク / かぶスク 等）
    let lessonName = "スクール";
    const teacherSnap = await db.collection("teacherId").doc(teacherId).get();
    if (teacherSnap.exists) {
      const t = teacherSnap.data() as any;
      if (t.lessonName) {
        lessonName = t.lessonName;
      }
    }

    // ② 通知対象ユーザーのトークンを全取得
    const usersSnap = await db.collection("users").get();

    const tokens: string[] = [];
    usersSnap.forEach((docSnap) => {
      const u = docSnap.data() as any;
      if (Array.isArray(u.notificationTokens)) {
        tokens.push(...u.notificationTokens);
      }
    });

    if (tokens.length === 0) {
      console.log("送信先トークンなし");
      return;
    }

    // ③ 通知内容：このスクールについて 1 通だけ送る
    const title = `${lessonName}の日程が更新されました！`;
    const body = "新しいスケジュールを確認してください。";

    const message: admin.messaging.MulticastMessage = {
  tokens,
  notification: {
    title,
    body,
  },
  data: {
    teacherId,
  },
};

// ★ sendMulticast ではなく sendEachForMulticast を使う
const res = await admin.messaging().sendEachForMulticast(message);

console.log(
  `通知送信: success=${res.successCount}, failure=${res.failureCount}`
);

// どんなエラーが出ているか詳細もログに出す（デバッグ用）
res.responses.forEach((r, index) => {
  if (!r.success) {
    console.log(`token[${index}] error:`, r.error);
  }
});

  }
);
