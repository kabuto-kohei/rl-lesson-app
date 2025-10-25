'use client';

import styles from './Header.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import LogoutButton from '@/app/component/Auth/LogoutButton'; 

type Props = {
  userName: string;
};

export default function UserHeader({ userName }: Props) {
  return (
    <header className={styles.header}>
      {/* ログアウトボタンに置き換え */}
      <div className={styles.backButton}>
        <LogoutButton  />
      </div>

      <div className={styles.userInfo}>
        <FontAwesomeIcon icon={faUserCircle} className={styles.avatarIcon} />
        <div className={styles.textBlock}>
          <span className={styles.welcome}>ようこそ</span>
          <span className={styles.name}>{userName} さん</span>
        </div>
      </div>
    </header>
  );
}
