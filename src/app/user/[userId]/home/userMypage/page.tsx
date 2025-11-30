'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import styles from './page.module.css';

// ★ 追加：通知用ヘルパー
import { requestNotificationPermissionAndSaveToken } from '@/firebaseMessaging';

type Teacher = {
  id: string;
  lessonName: string;
};

export default function UserMypage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [myTeachers, setMyTeachers] = useState<string[]>([]);
  const [savedTeachers, setSavedTeachers] = useState<string[]>([]);

  // ユーザー情報取得
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || '');
        setOriginalName(data.name || '');
        setMyTeachers(data.myTeachers || []);
        setSavedTeachers(data.myTeachers || []);
      }
    };
    fetchUser();
  }, [userId]);

  // 講師リスト取得
  useEffect(() => {
    const fetchTeachers = async () => {
      const snap = await getDocs(collection(db, 'teacherId'));
      const list: Teacher[] = snap.docs.map(doc => ({
        id: doc.id,
        lessonName: doc.data().lessonName || '(名前なし)',
      }));
      setTeachers(list);
    };
    fetchTeachers();
  }, []);

  const handleSaveName = async () => {
    if (!userId || name.trim() === '') return;
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, { name: name.trim() });
    alert('名前を更新しました');
    setOriginalName(name.trim());
  };

  const handleSaveTeachers = async () => {
    if (!userId) return;
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, { myTeachers });
    alert('Myスクールを更新しました');
    setSavedTeachers([...myTeachers]);
  };

  const toggleTeacher = (id: string) => {
    setMyTeachers(prev =>
      prev.includes(id)
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  // ★ 追加：通知ONボタン
  const handleEnableNotification = async () => {
    if (!userId) {
      alert('ユーザー情報がありません');
      return;
    }
    await requestNotificationPermissionAndSaveToken(userId);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>こんにちは {originalName} さん</h1>

      <div className={styles.box}>
        <h2 className={styles.subheading}>名前の変更</h2>
        <input
          type="text"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className={styles.button}
          onClick={handleSaveName}
          disabled={name.trim() === '' || name === originalName}
        >
          名前を更新
        </button>
      </div>

      <div className={styles.box}>
        <h2 className={styles.subheading}>Myスクールを選択</h2>
        <div className={styles.teacherSelectList}>
          {teachers.map((teacher) => {
            const selected = myTeachers.includes(teacher.id);
            return (
              <button
                key={teacher.id}
                className={`${styles.teacherButton} ${selected ? styles.selected : ''}`}
                onClick={() => toggleTeacher(teacher.id)}
                type="button"
              >
                {teacher.lessonName}
              </button>
            );
          })}
        </div>
        <button
          className={styles.button}
          onClick={handleSaveTeachers}
          disabled={JSON.stringify(myTeachers) === JSON.stringify(savedTeachers)}
        >
          Myスクールを保存
        </button>
      </div>

      {/* ★ 追加：スクール通知設定 */}
      <div className={styles.box}>
        <h2 className={styles.subheading}>スクール通知設定</h2>
        <button
          className={styles.button}
          type="button"
          onClick={handleEnableNotification}
        >
          📲 通知を受け取る
        </button>
      </div>
    </div>
  );
}
