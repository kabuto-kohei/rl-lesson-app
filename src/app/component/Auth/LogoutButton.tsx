'use client';

import { useRouter } from 'next/navigation';
import styles from './LogoutButton.module.css'; 

type Props = {
  className?: string;
  confirm?: boolean;
};

export default function LogoutButton({ className = '', confirm = true }: Props) {
  const router = useRouter();

  const handleLogout = () => {
    if (confirm && !window.confirm('ログアウトしますか？')) return;

    localStorage.removeItem('userId');
    router.push('/user/login');
  };

  return (
    <button
      onClick={handleLogout}
      className={`${styles.logoutButton} ${className}`}
    >
      ログアウト
    </button>
  );
}
