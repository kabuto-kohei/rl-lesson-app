'use client';

import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import BackButton from '@/app/component/BackButton/BackButton';

export default function UserHomePage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const goTo = (path: string) => {
    if (!userId) {
      alert('ユーザー情報がありません');
      return;
    }
    router.push(`/user/${userId}${path}`);
  };

  return (
    <div className={styles.container}>
      <BackButton href={`/user/login`} />
      <div className={styles.inner}>
        <h1 className={styles.heading}>マイページ</h1>
        <button className={`${styles.button} ${styles.classSelectButton}`} onClick={() => goTo('/home/userClassSelect')}>
          スクール日程
        </button>
        <button className={`${styles.button} ${styles.reserveButton}`} onClick={() => goTo('/home/userAddreservation')}>
          スクール予約
        </button>
        <button className={`${styles.button} ${styles.confirmButton}`} onClick={() => goTo('/home/userAllreservation')}>
          予約確認
        </button>
        <button className={`${styles.button} ${styles.userInfoButton}`} onClick={() => goTo('/home/userMypage')}>
          ユーザー情報
        </button>
      </div>
    </div>
  );
}  
