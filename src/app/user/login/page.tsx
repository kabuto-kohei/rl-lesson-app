'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function UserLoginPage() {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ★ 自動ログイン：保存済み userId があればログイン画面をスキップ
  useEffect(() => {
    const saved = localStorage.getItem('userId');
    if (saved) {
      router.replace(`/user/${saved}/home`);
    }
  }, [router]);

  const handleLogin = async () => {
    if (!userName.trim()) {
      alert('名前を入力してください');
      return;
    }

    try {
      setLoading(true);

      const q = query(
        collection(db, 'users'),
        where('name', '==', userName.trim())
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userId = snapshot.docs[0].id;

        // ★ ログイン保持：保存
        localStorage.setItem('userId', userId);

        router.push(`/user/${userId}/home`);
      } else {
        alert('該当するユーザーが見つかりません');
      }
    } catch (e) {
      console.error(e);
      alert('ログイン中にエラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>ログイン</h1>

        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="お名前を入力"
          className={styles.selectBox}
          disabled={loading}
        />

        <button
          onClick={handleLogin}
          disabled={!userName.trim() || loading}
          className={styles.button}
        >
          {loading ? '確認中…' : 'ログインする'}
        </button>

        <p className={styles.linkText}>
          新規登録の方は{' '}
          <Link href="/user/register" className={styles.link}>
            コチラ
          </Link>
        </p>
      </div>
    </div>
  );
}
