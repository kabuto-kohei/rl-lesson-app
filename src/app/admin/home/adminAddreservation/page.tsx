'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function AdminAddSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return (
      <div className={styles.container}>
        <p>講師IDが見つかりません。管理画面から遷移してください。</p>
      </div>
    );
  }

  const handleGoTo = (type: 'trial' | 'rope' | 'school') => {
    router.push(`/admin/home/adminAddreservation/${type}?teacherId=${teacherId}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>スクール＆予約枠の追加</h1>
      <p className={styles.subheading}>予約・追加する種類を選択してください。</p>

      <div className={styles.buttonGroup}>
        <button className={styles.button} onClick={() => handleGoTo('trial')}>
          体験スクールを追加
        </button>
        <button className={styles.button} onClick={() => handleGoTo('rope')}>
          ロープスクールを追加
        </button>
        <button className={styles.button} onClick={() => handleGoTo('school')}>
          スクール追加
        </button>
      </div>
    </div>
  );
}
