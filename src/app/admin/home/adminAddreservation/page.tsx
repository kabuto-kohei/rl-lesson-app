'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function AdminAddSelectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get('teacherId');

  const handleGoTo = (type: 'trial' | 'rope' | 'school') => {
    if (!teacherId) {
      alert('講師IDが見つかりません。最初の選択画面に戻ってください。');
      router.push('/admin/select');
      return;
    }

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

export default function AdminAddSelectPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <AdminAddSelectInner />
    </Suspense>
  );
}
