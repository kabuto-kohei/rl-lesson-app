'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import Calendar from '@/app/component/Calendar/Calendar';
import styles from './page.module.css';

export default function UserAllReservationPage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  type Participation = {
    id: string;
    date: string;
    time: string;
    lessonType: string;
    lessonName: string;
    isAbsent: boolean;
    scheduleId: string;
  };

  const [participations, setParticipations] = useState<Participation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchParticipations = async () => {
      if (!userId) return;

      const q = query(collection(db, 'participations'), where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const results: Participation[] = [];

      for (const docSnap of snapshot.docs) {
        const participationId = docSnap.id;
        const data = docSnap.data();
        const scheduleRef = doc(db, 'lessonSchedules', data.scheduleId);
        const scheduleSnap = await getDoc(scheduleRef);
        if (!scheduleSnap.exists()) continue;

        const schedule = scheduleSnap.data();
        const teacherRef = doc(db, 'teacherId', schedule.teacherId);
        const teacherSnap = await getDoc(teacherRef);

        results.push({
          id: participationId,
          scheduleId: data.scheduleId,
          date: schedule.date,
          time: schedule.time,
          lessonType: schedule.lessonType,
          lessonName: teacherSnap.exists() ? teacherSnap.data().lessonName : '未設定',
          isAbsent: data.isAbsent || false,
        });
      }

      setParticipations(results);

      // カレンダー用
      const map: Record<string, string[]> = {};
      results.forEach((r) => {
        if (!map[r.date]) map[r.date] = [];
        if (!map[r.date].includes(r.lessonName)) {
          map[r.date].push(r.lessonName);
        }
      });
      setLessonNameMap(map);
    };

    fetchParticipations();
  }, [userId]);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const filtered = participations.filter((p) => p.date === selectedDateStr);

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'boulder': return 'ボルダー';
      case 'lead': return 'リード';
      case 'both': return 'ボルダー・リード';
      default: return '不明';
    }
  };

  const goPrev = () => {
    const prev = new Date(year, month - 1);
    setYear(prev.getFullYear());
    setMonth(prev.getMonth());
  };

  const goNext = () => {
    const next = new Date(year, month + 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const toggleAbsent = async (participationId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'participations', participationId), {
        isAbsent: !currentStatus,
      });
      setParticipations((prev) =>
        prev.map((p) =>
          p.id === participationId ? { ...p, isAbsent: !currentStatus } : p
        )
      );
    } catch (err) {
      console.error('おやすみ更新エラー:', err);
      alert('変更に失敗しました');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>参加予定</h1>

      <Calendar
        year={year}
        month={month}
        selectedDates={selectedDate ? [selectedDate] : []}
        availableDates={Object.keys(lessonNameMap)}
        teacherColorMap={lessonNameMap}
        onDateSelect={setSelectedDate}
        goPrev={goPrev}
        goNext={goNext}
        mode="user"
      />

      {selectedDate && (
        <div className={styles.detail}>
          <p className={styles.dateTitle}>
            {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
            {selectedDate.getDate()}日
          </p>

          {filtered.length === 0 ? (
            <p className={styles.noReservation}>この日に参加予定はありません</p>
          ) : (
            <ul className={styles.reservationList}>
              {filtered.map((p) => (
                <li key={p.id} className={styles.reservationItem}>
                  <div className={styles.reservationInfo}>
                    <span className={styles.lessonMark}></span>
                    <span>
                      {p.lessonName}（{getLessonTypeLabel(p.lessonType)}）
                    </span>
                  </div>
                  <button
                    onClick={() => toggleAbsent(p.id, p.isAbsent)}
                    className={`${styles.statusButton} ${
                    p.isAbsent ? styles.statusAbsent : styles.statusParticipated
                    }`}
                    >
                    {p.isAbsent ? '参加' : 'おやすみ'}
                    </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

