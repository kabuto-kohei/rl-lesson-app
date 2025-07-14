'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import BackButton from "@/app/component/BackButton/BackButton";
import styles from './[teacherId].module.css';

export default function AdminHomeTeacherPage() {
  const { teacherId } = useParams();
  const [teacherName, setTeacherName] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacherName = async () => {
      if (!teacherId || typeof teacherId !== 'string') return;
      const ref = doc(db, 'teacherId', teacherId);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        setTeacherName(snapshot.data().name || '名前未設定');
      } else {
        setTeacherName('講師が見つかりません');
      }
    };
    fetchTeacherName();
  }, [teacherId]);

  return (
    <main className={styles["admin-home"]}>
      {/* ← inner の外に配置 */}
      <div className={styles.backButtonFixed}>
        <BackButton href="/admin/select" />
      </div>

      <div className={styles.inner}>
        <h1 className={styles["admin-heading"]}>
          ようこそ {teacherName ?? teacherId} さん
        </h1>

        <div className={styles["admin-buttons"]}>
          <button
            className={`${styles["admin-button"]} ${styles["add"]}`}
            onClick={() =>
              teacherId &&
              typeof teacherId === 'string' &&
              window.location.assign(`/admin/home/adminAddreservation?teacherId=${teacherId}`)
            }
          >
            予約追加
          </button>

          <button
            className={`${styles["admin-button"]} ${styles["list"]}`}
            onClick={() =>
              teacherId &&
              typeof teacherId === 'string' &&
              window.location.assign(`/admin/home/adminAllreservation?teacherId=${teacherId}`)
            }
          >
            スクール一覧
          </button>

          <button
            className={`${styles["admin-button"]} ${styles["mypage"]}`}
            onClick={() =>
              teacherId &&
              typeof teacherId === 'string' &&
              window.location.assign(`/admin/home/adminMypage?teacherId=${teacherId}`)
            }
          >
            マイページ
          </button>
        </div>
      </div>
    </main>
  );
}
