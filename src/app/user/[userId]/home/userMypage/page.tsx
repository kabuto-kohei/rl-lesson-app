'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import styles from './page.module.css';
import BackButton from '@/app/component/BackButton/BackButton';

export default function UserMypage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || '');
        setOriginalName(data.name || '');
      }
    };
    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    if (!userId || name.trim() === '') return;
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, { name: name.trim() });
    alert('名前を更新しました');
    setOriginalName(name.trim());
  };

  return (
    <div className={styles.container}>
      <BackButton href={`/user/${userId}/home`} />
      <div className={styles.inner}>
        <h1 className={styles.heading}>こんにちは {originalName} さん</h1>
        <input
          type="text"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className={styles.button}
          onClick={handleSave}
          disabled={name.trim() === '' || name === originalName}
        >
          名前を更新
        </button>
      </div>
    </div>
  );
}
