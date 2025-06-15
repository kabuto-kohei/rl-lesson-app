'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import BackButton from '@/app/component/BackButton/BackButton';
import styles from './AdminAllReservation.module.css';

// 型定義
type Schedule = {
  id: string;
  date: string;
  time: string;
  capacity: number;
  lessonType: string;
  memo?: string;
  teacherId: string;
  createdAt?: Timestamp;
};

export default function AdminAllReservationPage() {
  const [teacherId, setTeacherId] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [lessonNameById, setLessonNameById] = useState<Record<string, string>>({});

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const lessonNameColorMap: Record<string, string> = {
    'れおスク': '#fca5a5',
    'そらスク': '#93c5fd',
    'かぶスク': '#fcd34d',
    'おーらんスクール': '#34d399',
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('teacherId');
    if (id) setTeacherId(id);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'lessonSchedules'));
      const scheduleList: Schedule[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Schedule[];
      setSchedules(scheduleList);

      const lessonMap: Record<string, Set<string>> = {};
      const lessonById: Record<string, string> = {};

      for (const s of scheduleList) {
        const teacherRef = doc(db, 'teacherId', s.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const lessonName = teacherSnap.exists() ? teacherSnap.data().lessonName || '未設定' : '未設定';

        lessonById[s.teacherId] = lessonName;
        if (!lessonMap[s.date]) lessonMap[s.date] = new Set();
        lessonMap[s.date].add(lessonName);
      }

      const finalMap: Record<string, string[]> = {};
      Object.entries(lessonMap).forEach(([date, set]) => {
        finalMap[date] = Array.from(set);
      });
      setLessonNameMap(finalMap);
      setLessonNameById(lessonById);
    };
    fetchData();
  }, []);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const filteredSchedules = schedules
    .filter(s => s.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

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

  return (
    <div className={styles.container}>
      <BackButton href={`/admin/home/${teacherId}`} />
      <h1 className={styles.heading}>全講師の予約一覧</h1>

      <Calendar
        year={year}
        month={month}
        selectedDate={selectedDate}
        availableDates={Object.keys(lessonNameMap)}
        teacherColorMap={lessonNameMap}
        onDateSelect={setSelectedDate}
        goPrev={goPrev}
        goNext={goNext}
        mode="admin"
      />

      <div className={styles.legend}>
        {Object.values(lessonNameColorMap).map((color, idx) => {
          const name = Object.keys(lessonNameColorMap)[idx];
          return (
            <div key={idx} className={styles.legendItem}>
              <span className={styles.circle} style={{ backgroundColor: color }} />：{name}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className={styles.detail}>
          <p className={styles.dateTitle}>
            {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
          </p>

          {filteredSchedules.length === 0 ? (
            <p className={styles.noReservation}>この日の予約はありません</p>
          ) : (
            <ul className={styles.reservationList}>
              {filteredSchedules.map((s) => {
                const createdAtStr = s.createdAt?.toDate
                  ? s.createdAt.toDate().toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '日時不明';

                return (
                  <li key={s.id} className={styles.reservationItem}>
                    <div className={styles.reservationInfo}>
                      <div className={styles.lessonName}>
                        {lessonNameById[s.teacherId]}（{getLessonTypeLabel(s.lessonType)}）
                      </div>
                      <div className={styles.timeAndCapacity}>
                        {s.time}｜定員：{s.capacity}
                      </div>
                      <div className={styles.createdAt}>
                        作成日時：{createdAtStr}
                      </div>
                      {s.memo && (
                        <div className={styles.memo}>メモ：{s.memo}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

