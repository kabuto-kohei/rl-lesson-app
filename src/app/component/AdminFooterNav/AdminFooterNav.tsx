'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminFooterNav.module.css';

export default function AdminFooterNav() {
  const pathname = usePathname();
  const [teacherId, setTeacherId] = useState('');

  useEffect(() => {
    const storedId = localStorage.getItem('adminTeacherId');
    if (storedId) {
      setTeacherId(storedId);
    }
  }, []);

  if (!teacherId) return null; // teacherId 未取得なら描画しない

  return (
    <nav className={styles.nav}>
      {/* ✅ ホーム：/admin/home/[teacherId] */}
      <Link
        href={`/admin/home/${teacherId}`}
        className={`${styles.link} ${pathname === `/admin/home/${teacherId}` ? styles.active : ''}`}
      >
        <span className={styles.icon}>🏠</span>
        <span className={styles.label}>ホーム</span>
      </Link>

      <Link
        href={`/admin/home/adminAddreservation?teacherId=${teacherId}`}
        className={`${styles.link} ${pathname.includes('/adminAddreservation') ? styles.active : ''}`}
      >
        <span className={styles.icon}>➕</span>
        <span className={styles.label}>予約追加</span>
      </Link>

      <Link
        href={`/admin/home/adminAllreservation?teacherId=${teacherId}`}
        className={`${styles.link} ${pathname.includes('/adminAllreservation') ? styles.active : ''}`}
      >
        <span className={styles.icon}>☑️</span>
        <span className={styles.label}>スクール一覧</span>
      </Link>

      <Link
        href={`/admin/home/adminMypage?teacherId=${teacherId}`}
        className={`${styles.link} ${pathname.includes('/adminMypage') ? styles.active : ''}`}
      >
        <span className={styles.icon}>👤</span>
        <span className={styles.label}>マイページ</span>
      </Link>
    </nav>
  );
}
