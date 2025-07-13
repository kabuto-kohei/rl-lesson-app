'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import styles from './FooterNav.module.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faCalendarDays,
  faPen,
  faCheckSquare,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

export default function FooterNav() {
  const pathname = usePathname();
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  return (
    <nav className={styles.nav}>
      <Link
        href={`/user/${userId}/home`}
        className={`${styles.link} ${pathname === `/user/${userId}/home` ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faHouse} className={styles.icon} />
        <span className={styles.label}>ホーム</span>
      </Link>

      <Link
        href={`/user/${userId}/home/userClassSelect`}
        className={`${styles.link} ${pathname === `/user/${userId}/home/userClassSelect` ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faCalendarDays} className={styles.icon} />
        <span className={styles.label}>日程</span>
      </Link>

      <Link
        href={`/user/${userId}/home/userAddreservation`}
        className={`${styles.link} ${pathname === `/user/${userId}/home/userAddreservation` ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faPen} className={styles.icon} />
        <span className={styles.label}>予約</span>
      </Link>

      <Link
        href={`/user/${userId}/home/userAllreservation`}
        className={`${styles.link} ${pathname === `/user/${userId}/home/userAllreservation` ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faCheckSquare} className={styles.icon} />
        <span className={styles.label}>確認</span>
      </Link>

      <Link
        href={`/user/${userId}/home/userMypage`}
        className={`${styles.link} ${pathname === `/user/${userId}/home/userMypage` ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faUser} className={styles.icon} />
        <span className={styles.label}>マイページ</span>
      </Link>
    </nav>
  );
}
