'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import BackButton from "@/app/component/BackButton/BackButton";
import styles from './AdminMypage.module.css';

type Schedule = {
  id: string;
  date: string;
  time: string;
  capacity: number;
  lessonType: string;
  memo?: string;
  teacherId: string;
};

type Booking = {
  scheduleId: string;
  userId: string;
};

type User = {
  id: string;
  name: string;
};

export default function AdminMypagePage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookingsMap, setBookingsMap] = useState<Record<string, string[]>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('teacherId');
    if (id) setTeacherId(id);
  }, []);

  useEffect(() => {
    if (!teacherId) return;

    const fetchData = async () => {
      // スケジュール取得
      const snapshot = await getDocs(collection(db, 'lessonSchedules'));
      const scheduleList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => (s as Schedule).teacherId === teacherId) as Schedule[];

      setSchedules(scheduleList);

      // 講師データ一括取得
      const teacherSnap = await getDocs(collection(db, 'teacherId'));
      const teacherMap: Record<string, string> = {};
      teacherSnap.docs.forEach(doc => {
        teacherMap[doc.id] = doc.data().lessonName || '未設定';
      });

      // 日付→スクール名Map構築
      const tempMap: Record<string, Set<string>> = {};
      for (const s of scheduleList) {
        const lesson = teacherMap[s.teacherId] || '未設定';
        if (!tempMap[s.date]) tempMap[s.date] = new Set();
        tempMap[s.date].add(lesson);
      }
      const finalMap: Record<string, string[]> = {};
      Object.entries(tempMap).forEach(([date, set]) => {
        finalMap[date] = Array.from(set);
      });
      setLessonNameMap(finalMap);

      // 予約情報
      const bookingSnap = await getDocs(collection(db, 'bookings'));
      const bookings = bookingSnap.docs.map(doc => doc.data() as Booking);
      const bookingMap: Record<string, string[]> = {};
      bookings.forEach(b => {
        if (!bookingMap[b.scheduleId]) bookingMap[b.scheduleId] = [];
        bookingMap[b.scheduleId].push(b.userId);
      });
      setBookingsMap(bookingMap);

      // ユーザー情報
      const userSnap = await getDocs(collection(db, 'users'));
      const users: Record<string, string> = {};
      userSnap.docs.forEach(doc => {
        users[doc.id] = (doc.data() as User).name;
      });
      setUserMap(users);
    };

    fetchData();
  }, [teacherId]);

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => a.date.localeCompare(b.date));
  }, [schedules]);

  const reservedDates = useMemo(() => {
    return Object.keys(lessonNameMap);
  }, [lessonNameMap]);

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

  return (
    <main className={styles.container}>
      <BackButton href={`/admin/home/${teacherId}`} />
      <h1 className={styles.heading}>マイページ</h1>

      <div className={styles.calendarWrapper}>
        <Calendar
          year={year}
          month={month}
          selectedDates={[]}  
          availableDates={reservedDates}
          teacherColorMap={lessonNameMap}
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
