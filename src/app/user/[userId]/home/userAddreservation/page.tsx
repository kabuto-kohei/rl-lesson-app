'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import styles from './page.module.css';

type Schedule = {
  id: string;
  date: string;
  time: string;
  lessonType: string;
  teacherId: string;
  capacity: number;
  memo?: string;
};

export default function UserAddReservationPage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessonNameById, setLessonNameById] = useState<Record<string, string>>({});
  const [classTypeById, setClassTypeById] = useState<Record<string, string>>({});
  const [dateToLessonNameMap, setDateToLessonNameMap] = useState<Record<string, string[]>>({});
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchSchedulesAndBookings = async () => {
      // スケジュール取得
      const snapshot = await getDocs(collection(db, 'lessonSchedules'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Schedule[];
      setSchedules(data);

      // 先生情報と地図生成
      const lessonMap: Record<string, Set<string>> = {};
      const nameMap: Record<string, string> = {};
      const typeMap: Record<string, string> = {};

      for (const s of data) {
        const teacherRef = doc(db, 'teacherId', s.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};
        const lesson = teacherData.lessonName || '未設定';
        const classType = teacherData.ClassType || '未設定';

        nameMap[s.teacherId] = lesson;
        typeMap[s.teacherId] = classType;

        if (classType === 'マスタークラス') {
          if (!lessonMap[s.date]) lessonMap[s.date] = new Set();
          lessonMap[s.date].add(lesson);
        }
      }

      const finalMap: Record<string, string[]> = {};
      Object.entries(lessonMap).forEach(([date, set]) => {
        finalMap[date] = Array.from(set);
      });

      setLessonNameById(nameMap);
      setClassTypeById(typeMap);
      setDateToLessonNameMap(finalMap);

      // 予約件数取得
      const bookingSnapshot = await getDocs(collection(db, 'bookings'));
      const counts: Record<string, number> = {};
      bookingSnapshot.docs.forEach(doc => {
        const booking = doc.data();
        const sid = booking.scheduleId;
        if (counts[sid]) {
          counts[sid] += 1;
        } else {
          counts[sid] = 1;
        }
      });
      setBookingCounts(counts);
    };

    fetchSchedulesAndBookings();
  }, []);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const allMatchingSchedules = schedules.filter(s => s.date === selectedDateStr);
  const dailySchedules = allMatchingSchedules.filter(s => classTypeById[s.teacherId] === 'マスタークラス');

  const groupedSchedules: Record<string, Schedule[]> = {};
  for (const schedule of dailySchedules) {
    if (!groupedSchedules[schedule.teacherId]) {
      groupedSchedules[schedule.teacherId] = [];
    }
    groupedSchedules[schedule.teacherId].push(schedule);
  }

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

  const handleReserve = async (scheduleId: string, capacity: number) => {
    if (!userId) {
      alert('ユーザーIDが見つかりません');
      return;
    }

    try {
      // 最新予約件数を再取得
      const q = query(collection(db, 'bookings'), where('scheduleId', '==', scheduleId));
      const snapshot = await getDocs(q);
      const currentCount = snapshot.size;

      if (currentCount >= capacity) {
        alert('申し訳ございません、この枠は満席です。');
        return;
      }

      await addDoc(collection(db, 'bookings'), {
        scheduleId,
        userId,
        createdAt: Timestamp.now(),
      });
      alert('予約が完了しました');
      // 画面のカウントも更新
      setBookingCounts(prev => ({
        ...prev,
        [scheduleId]: (prev[scheduleId] || 0) + 1,
      }));
    } catch (error) {
      console.error('予約エラー:', error);
      alert('予約に失敗しました');
    }
  };

return (
  <div className={styles.container}>
    <h1 className={styles.heading}>スクール予約</h1>
    <p className={styles.subheading}>マスタークラスの予約カレンダーになります。</p>

    <Calendar
      year={year}
      month={month}
      selectedDates={selectedDate ? [selectedDate] : []}
      availableDates={Object.keys(dateToLessonNameMap)}
      teacherColorMap={dateToLessonNameMap}
      onDateSelect={setSelectedDate}
      goPrev={goPrev}
      goNext={goNext}
      mode="user"
    />

    {selectedDate && (
      <div className={styles.detail}>
        <p className={styles.dateTitle}>選択日: {selectedDate.toLocaleDateString()}</p>
        <p className={styles.subnote}>※マスタークラスのみ表示</p>

        {dailySchedules.length === 0 ? (
          <p className={styles.noReservation}>この日に予約枠はありません</p>
        ) : (
          <div className={styles.groupedList}>
            {Object.entries(groupedSchedules).map(([teacherId, scheduleList]) => (
              <div key={teacherId} className={styles.teacherGroup}>
                <h3 className={styles.teacherName}>
                  {lessonNameById[teacherId] || '講師名未設定'}
                </h3>
                <ul className={styles.reservationList}>
                  {scheduleList.map((s) => {
                    const booked = bookingCounts[s.id] || 0;
                    const remaining = s.capacity - booked;

                    return (
                      <li key={s.id} className={styles.reservationItem}>
                        <div className={styles.reservationInfo}>
                          <div className={styles.lessonType}>
                            {getLessonTypeLabel(s.lessonType)}
                          </div>
                          <div className={styles.timeAndCapacity}>
                            {s.time}｜定員：{s.capacity}｜残り：{remaining}
                          </div>
                          {s.memo && (
                            <div className={styles.memo}>メモ：{s.memo}</div>
                          )}
                        </div>
                        <button
                          className={styles.reserveButton}
                          onClick={() => handleReserve(s.id, s.capacity)}
                          disabled={remaining <= 0}
                        >
                          {remaining <= 0 ? '満席' : '予約'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);
}
