'use client';

import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function UserLoginPage() {
  const [userName, setUserName] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!userName.trim()) {
      alert('名前を入力してください');
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('name', '==', userName.trim())
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userId = snapshot.docs[0].id;
      router.push(`/user/${userId}/home`); // ← 修正ここ！
    } else {
      alert('該当するユーザーが見つかりません');
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
        />

        <button
          onClick={handleLogin}
          disabled={!userName.trim()}
          className={styles.button}
        >
          ログインする
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
