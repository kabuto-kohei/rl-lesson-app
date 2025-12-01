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
 * 対象スクール1件分の「日程が更新されました」通知を送る。
 * ただし同じ teacherId については「10分以内の重複通知」を防ぐ。
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

    const data = snap.data() as { teacherId?: string };
    const teacherId = data.teacherId;
    if (!teacherId) {
      console.log("teacherId がありません");
      return;
    }

    // ① 10分以内に同じ teacherId で通知済みならスキップ
    const metaRef = db
      .collection("lessonScheduleNotificationMeta")
      .doc(teacherId);
    const metaSnap = await metaRef.get();

    const now = admin.firestore.Timestamp.now();
    const tenMinutesMs = 10 * 60 * 1000;

    if (metaSnap.exists) {
      const meta = metaSnap.data() as { lastNotifiedAt?: admin.firestore.Timestamp };
      if (meta.lastNotifiedAt) {
        const lastMs = meta.lastNotifiedAt.toMillis();
        const nowMs = now.toMillis();
        if (nowMs - lastMs < tenMinutesMs) {
          console.log(
            `同じteacherId(${teacherId})への通知から10分経っていないためスキップ`
          );
          return;
        }
      }
    }

    // ② teacherId コレクションから lessonName を取得（レオスク / ソラスク / かぶスク 等）
    let lessonName = "スクール";
    const teacherSnap = await db.collection("teacherId").doc(teacherId).get();
    if (teacherSnap.exists) {
      const t = teacherSnap.data() as any;
      if (t.lessonName) {
        lessonName = t.lessonName;
      }
    }

    // ③ 通知対象ユーザーのトークンを全取得
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
      // 通知は送ってないので lastNotifiedAt も更新しない
      return;
    }

    // 通知のメッセージ編集は以下
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

    // ④ 通知送信（/batch 問題を避けるなら sendEachForMulticast 推奨）
    const res = await admin.messaging().sendEachForMulticast(message);

    console.log(
      `通知送信: success=${res.successCount}, failure=${res.failureCount}`
    );

    // 失敗ばかり・全部ダメなら lastNotifiedAt を更新しない、などもありだけど
    // ここでは一旦「送信処理を実行したら更新」とする
    await metaRef.set(
      {
        lastNotifiedAt: now,
      },
      { merge: true }
    );

    // デバッグ用：失敗したトークンの詳細もログ出し
    res.responses.forEach((r, index) => {
      if (!r.success) {
        console.log(`token[${index}] error:`, r.error);
      }
    });
  }
);
