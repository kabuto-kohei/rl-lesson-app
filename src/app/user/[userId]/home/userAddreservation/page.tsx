'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import styles from './page.module.css';
import BackButton from '@/app/component/BackButton/BackButton';

type Schedule = {
  id: string;
  date: string;
  time: string;
  lessonType: string;
  teacherId: string;
};

export default function UserAddReservationPage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessonName, setLessonName] = useState<string | null>(null);
  const [dateToLessonNameMap, setDateToLessonNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSchedules = async () => {
      const snapshot = await getDocs(collection(db, 'lessonSchedules'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Schedule[];
      setSchedules(data);

      const map: Record<string, string> = {};
      for (const s of data) {
        const teacherRef = doc(db, 'teacherId', s.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const lesson = teacherSnap.exists() ? teacherSnap.data().lessonName || '未設定' : '未設定';
        map[s.date] = lesson;
      }
      setDateToLessonNameMap(map);
    };
    fetchSchedules();
  }, []);

  useEffect(() => {
    const fetchLessonName = async () => {
      if (!selectedDate) return;
      const selectedDateStr = formatDate(selectedDate);
      const matchedSchedule = schedules.find(s => s.date === selectedDateStr);
      if (!matchedSchedule) {
        setLessonName(null);
        return;
      }
      const teacherRef = doc(db, 'teacherId', matchedSchedule.teacherId);
      const teacherSnap = await getDoc(teacherRef);
      if (teacherSnap.exists()) {
        setLessonName(teacherSnap.data().lessonName || null);
      } else {
        setLessonName(null);
      }
    };
    fetchLessonName();
  }, [selectedDate, schedules]);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const dailySchedules = schedules.filter(s => s.date === selectedDateStr);

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

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'boulder':
        return 'ボルダー';
      case 'lead':
        return 'リード';
      case 'both':
        return 'ボルダー・リード';
      default:
        return '不明';
    }
  };

  const handleReserve = async (scheduleId: string) => {
    if (!userId) {
      alert('ユーザーIDが見つかりません');
      return;
    }

    try {
      await addDoc(collection(db, 'bookings'), {
        scheduleId,
        userId,
        createdAt: Timestamp.now(),
      });
      alert('予約が完了しました');
    } catch (error) {
      console.error('予約エラー:', error);
      alert('予約に失敗しました');
    }
  };

  return (
    <div className={styles.container}>
      <BackButton href={`/user/${userId}/home`} />
      <h1 className={styles.heading}>スクール予約</h1>
      <p className={styles.subheading}>マスタークラスの予約カレンダーになります。</p>
      <Calendar
        year={year}
        month={month}
        selectedDate={selectedDate}
        availableDates={Object.keys(dateToLessonNameMap)}
        teacherColorMap={dateToLessonNameMap} 
        onDateSelect={setSelectedDate}
        goPrev={goPrev}
        goNext={goNext}
        mode="user"
      />
      {selectedDate && (
        <div className={styles.detail}>
          {lessonName && (
            <p className={styles.lessonName}>担当スクール：{lessonName}</p>
          )}
          <p>選択日: {selectedDate.toLocaleDateString()}</p>
          {dailySchedules.length === 0 ? (
            <p>この日に予約枠はありません</p>
          ) : (
            dailySchedules.map(s => (
              <div key={s.id} className={styles.slot}>
                <p>時間：{s.time}</p>
                <p>種別：{getLessonTypeLabel(s.lessonType)}</p>
                <button
                  className={styles.reserveButton}
                  onClick={() => handleReserve(s.id)}
                >
                  予約
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
