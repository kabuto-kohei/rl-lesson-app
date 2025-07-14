'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function ClientWrapper() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('teacherId');
    if (id) setTeacherId(id);
  }, []);

  const handleGoTo = (type: 'trial' | 'rope' | 'school') => {
    if (!teacherId) {
      alert('講師IDが見つかりません。');
      return;
    }
    router.push(`/admin/home/adminAddreservation/${type}?teacherId=${teacherId}`);
  };

  if (!teacherId) {
    return (
      <div className={styles.container}>
        <p>講師IDが見つかりません。管理画面から遷移してください。</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>スクール＆予約枠の追加</h1>
      <p className={styles.subheading}>予約・追加する種類を選択してください。</p>

      <div className={styles.buttonGroup}>
        <button className={styles.button} onClick={() => handleGoTo('trial')}>
          体験スクールを追加
        </button>
        <button className={styles.button} onClick={() => handleGoTo('rope')}>
          ロープ体験・講習を追加
        </button>
        <button className={styles.button} onClick={() => handleGoTo('school')}>
          スクールを追加
        </button>
      </div>
    </div>
  );
}
