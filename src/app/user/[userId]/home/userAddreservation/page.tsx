'use client';

import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function UserAddSelectPage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const goTo = (type: 'trial' | 'rope' | 'master') => {
    if (!userId) {
      alert('ユーザー情報が見つかりません');
      return;
    }
    router.push(`/user/${userId}/home/userAddreservation/${type}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>予約タイプを選択</h1>
        <button className={styles.button} onClick={() => goTo('trial')}>
          スクール体験予約
        </button>
        <button className={styles.button} onClick={() => goTo('rope')}>
          ロープ講習予約
        </button>
        <button className={styles.button} onClick={() => goTo('master')}>
          マスタークラス予約
        </button>
      </div>
    </div>
  );
}
