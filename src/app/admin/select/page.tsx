'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useRouter } from 'next/navigation';
import styles from './select.module.css';

type Teacher = {
  id: string;
  name: string;
};

export default function AdminSelectPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchTeachers = async () => {
      const snapshot = await getDocs(collection(db, 'teacherId'));
      const teacherList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '無名の講師',
      }));
      setTeachers(teacherList);
    };
    fetchTeachers();
  }, []);

  const handleNavigate = () => {
    if (selectedTeacherId) {
      router.push(`/admin/home/${selectedTeacherId}`);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>講師を選択してください</h1>
        <div className={styles.selectRow}>
          <select
            className={styles.selectBox}
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
          >
            <option value="">選択してください</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
  
          <button
            onClick={handleNavigate}
            disabled={!selectedTeacherId}
            className={styles.button}
          >
            決定
          </button>
        </div>
      </div>
    </main>  
  );  
}

