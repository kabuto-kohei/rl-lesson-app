'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminFooterNav.module.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faPlus,
  faCheckSquare,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

export default function AdminFooterNav() {
  const pathname = usePathname();
  const [teacherId, setTeacherId] = useState('');

  useEffect(() => {
    const storedId = localStorage.getItem('adminTeacherId');
    if (storedId) {
      setTeacherId(storedId);
    }
  }, []);

  if (!teacherId) return null;

  return (
    <nav className={styles.nav}>
      <Link
        href={`/admin/home/${teacherId}`}
        className={`${styles.link} ${pathname === `/admin/home/${teacherId}` ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faHouse} className={styles.icon} />
        <span className={styles.label}>ホーム</span>
      </Link>

      <Link
        href={`/admin/home/adminAddreservation?teacherId=${teacherId}`}
        className={`${styles.link} ${pathname.includes('/adminAddreservation') ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faPlus} className={styles.icon} />
        <span className={styles.label}>追加</span>
      </Link>

      <Link
        href={`/admin/home/adminAllreservation?teacherId=${teacherId}`}
        className={`${styles.link} ${pathname.includes('/adminAllreservation') ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faCheckSquare} className={styles.icon} />
        <span className={styles.label}>スクール一覧</span>
      </Link>

      <Link
        href={`/admin/home/adminMypage?teacherId=${teacherId}`}
        className={`${styles.link} ${pathname.includes('/adminMypage') ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faUser} className={styles.icon} />
        <span className={styles.label}>マイページ</span>
      </Link>
    </nav>
  );
}
