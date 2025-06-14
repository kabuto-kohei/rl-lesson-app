'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import BackButton from "@/app/component/BackButton/BackButton";
import styles from './AdminAllReservation.module.css';

type Schedule = {
  id: string;
  date: string;
  time: string;
  capacity: number;
  lessonType: string;
  memo?: string;
};

type Booking = {
  scheduleId: string;
  userId: string;
};

type User = {
  id: string;
  name: string;
};

export default function AdminAllReservationPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setTeacherId(params.get('teacherId'));
    }
  }, []);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookingsMap, setBookingsMap] = useState<Record<string, string[]>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    if (!teacherId) return;

    const fetchData = async () => {
      const q = query(collection(db, 'lessonSchedules'), where('teacherId', '==', teacherId));
      const snapshot = await getDocs(q);

      const scheduleList: Schedule[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Schedule[];
      setSchedules(scheduleList);

      const bookingSnap = await getDocs(collection(db, 'bookings'));
      const bookings = bookingSnap.docs.map(doc => doc.data() as Booking);

      const bookingsGrouped: Record<string, string[]> = {};
      bookings.forEach(b => {
        if (!bookingsGrouped[b.scheduleId]) bookingsGrouped[b.scheduleId] = [];
        bookingsGrouped[b.scheduleId].push(b.userId);
      });
      setBookingsMap(bookingsGrouped);

      const userSnap = await getDocs(collection(db, 'users'));
      const userMapTemp: Record<string, string> = {};
      userSnap.docs.forEach(doc => {
        const user = doc.data() as User;
        userMapTemp[doc.id] = user.name;
      });
      setUserMap(userMapTemp);
    };

    fetchData();
  }, [teacherId]);

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm('この予約枠を削除しますか？')) return;

    try {
      await deleteDoc(doc(db, 'lessonSchedules', scheduleId));
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      alert('削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const sortedSchedules = schedules.sort((a, b) => a.date.localeCompare(b.date));
  const reservedDates = [...new Set(schedules.map(s => s.date))];

  return (
    <main className={styles.container}>
      <BackButton href={`/admin/home/${teacherId}`} />
      <h1 className={styles.heading}>予約一覧</h1>

      <div className={styles.calendarWrapper}>
        <Calendar
          year={year}
          month={month}
          selectedDate={null}
          availableDates={reservedDates}
          onDateSelect={() => {}}
          goPrev={() => {
            if (month === 0) {
              setYear(y => y - 1);
              setMonth(11);
            } else {
              setMonth(m => m - 1);
            }
          }}
          goNext={() => {
            if (month === 11) {
              setYear(y => y + 1);
              setMonth(0);
            } else {
              setMonth(m => m + 1);
            }
          }}
          mode="admin"
        />
      </div>

      {sortedSchedules.map((s) => {
        const participants = bookingsMap[s.id] || [];
        const participantNames = participants.map(uid => userMap[uid] || '名前不明');

        return (
          <div key={s.id} className={styles.card}>
            <h2 className={styles.date}>
              📝 {formatDate(s.date)}
              <button
                className={styles.deleteButton}
                onClick={() => handleDeleteSchedule(s.id)}
              >
                削除
              </button>
            </h2>
            <p className={styles.detail}>
              時間：{s.time}（定員{s.capacity}）{getLessonTypeLabel(s.lessonType)}
              {s.memo && `｜メモ：${s.memo}`}
            </p>
            <p className={styles.label}>参加者：</p>
            <ul className={styles.participants}>
              {participantNames.length > 0 ? (
                participantNames.map((name, idx) => <li key={idx}>・{name}</li>)
              ) : (
                <li>なし</li>
              )}
            </ul>
          </div>
        );
      })}
    </main>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
}

function getLessonTypeLabel(type: string) {
  switch (type) {
    case 'boulder': return 'ボルダー';
    case 'lead': return 'リード';
    case 'both': return '両方';
    default: return '';
  }
}
