'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import styles from './page.module.css';
import BackButton from '@/app/component/BackButton/BackButton';
import UserHeader from '@/app/component/Header/Header';

export default function UserHomePage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const [userName, setUserName] = useState<string>('ゲスト');

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUserName(snap.data().name || 'ゲスト');
      }
    };
    fetchUser();
  }, [userId]);

  const goTo = (path: string) => {
    if (!userId) {
      alert('ユーザー情報がありません');
      return;
    }
    router.push(`/user/${userId}${path}`);
  };

  return (
    <div className={styles.container}>
      <UserHeader userName={userName} />

      <BackButton href={`/user/login`} />
      <div className={styles.inner}>
        <h1 className={styles.heading}>HOME</h1>
        <button
          className={`${styles.button} ${styles.classSelectButton}`}
          onClick={() => goTo('/home/userClassSelect')}
        >
          スクール日程
        </button>
        <button
          className={`${styles.button} ${styles.reserveButton}`}
          onClick={() => goTo('/home/userAddreservation')}
        >
          スクール予約
        </button>
        <button
          className={`${styles.button} ${styles.confirmButton}`}
          onClick={() => goTo('/home/userAllreservation')}
        >
          予約確認
        </button>
        <button
          className={`${styles.button} ${styles.userInfoButton}`}
          onClick={() => goTo('/home/userMypage')}
        >
          ユーザー情報
        </button>
      </div>
    </div>
  );
}
