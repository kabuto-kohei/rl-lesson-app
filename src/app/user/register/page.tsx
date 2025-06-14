'use client';

import { useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function UserRegisterPage() {
  const [userName, setUserName] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    if (!userName.trim()) {
      alert('名前を入力してください');
      return;
    }

    try {
        await addDoc(collection(db, 'users'), {
          name: userName.trim(),
          createdAt: Timestamp.now(),
        });
        router.push('/user/login');
      } catch (error) {
        console.error('登録エラー:', error);
        alert('登録に失敗しました');
      }
    }
      
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
        />
        <button
          onClick={handleRegister}
          disabled={!userName.trim()}
          className={styles.button}
        >
          登録してはじめる
        </button>
      </div>
    </div>
  );
}
