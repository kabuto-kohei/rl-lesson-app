'use client';

import { useState } from 'react';
import { addDoc, collection, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function UserRegisterPage() {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!userName.trim()) {
      alert('名前を入力してください');
      return;
    }

    try {
      setLoading(true);

      // ★ 同名チェック（重複登録防止）
      const q = query(collection(db, 'users'), where('name', '==', userName.trim()));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const ok = window.confirm('同じ名前のユーザーが既に存在します。続行しますか？');
        if (!ok) {
          setLoading(false);
          return;
        }
      }

      // ★ 新規登録
      const docRef = await addDoc(collection(db, 'users'), {
        name: userName.trim(),
        createdAt: Timestamp.now(),
      });

      const userId = docRef.id;

      // ★ 登録後に自動ログイン（localStorage に保存）
      localStorage.setItem('userId', userId);

      // ★ 自動的にホーム画面へ遷移
      router.push(`/user/${userId}/home`);
    } catch (error) {
      console.error('登録エラー:', error);
      alert('登録に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>ユーザー登録</h1>

        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="お名前を入力"
          className={styles.selectBox}
          disabled={loading}
        />

        <button
          onClick={handleRegister}
          disabled={!userName.trim() || loading}
          className={styles.button}
        >
          {loading ? '登録中…' : '登録してはじめる'}
        </button>
      </div>
    </div>
  );
}
