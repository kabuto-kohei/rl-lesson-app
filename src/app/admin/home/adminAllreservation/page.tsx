'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
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
  teacherId: string;
};

export default function AdminAllReservationPage() {
  const [teacherId, setTeacherId] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string>>({});

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const lessonNameColorMap: Record<string, string> = {
    'れおスク': '#fca5a5',
    'そらスク': '#93c5fd',
    '未設定': 'gray',
  };

  const getColorForLesson = (lessonName: string): string => {
    return lessonNameColorMap[lessonName] || '#ccc';
  };

  // ✅ teacherId を URL クエリから取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('teacherId');
      if (id) setTeacherId(id);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'lessonSchedules'));
        const scheduleList: Schedule[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Schedule[];
        setSchedules(scheduleList);

        const lessonMap: Record<string, string> = {};
        for (const s of scheduleList) {
          const teacherRef = doc(db, 'teacherId', s.teacherId);
          const teacherSnap = await getDoc(teacherRef);
          const lessonName = teacherSnap.exists()
            ? teacherSnap.data().lessonName || '未設定'
            : '未設定';
          if (!lessonMap[s.date]) {
            lessonMap[s.date] = lessonName;
          }
        }
        setLessonNameMap(lessonMap);
      } catch (err) {
        console.error('データ取得エラー:', err);
      }
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
  const filteredSchedules = schedules.filter((s) => s.date === selectedDateStr);

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
      {/* ✅ 戻るボタン（teacherIdを反映） */}
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

      {/* 凡例表示 */}
      {lessonNameMap && Object.values(lessonNameMap).length > 0 && (
        <div className={styles.legend}>
          {Array.from(new Set(Object.values(lessonNameMap))).map((lessonName, idx) => {
            const color = getColorForLesson(lessonName);
            return (
              <div key={idx} className={styles.legendItem}>
                <span className={styles.circle} style={{ backgroundColor: color }} />
                ：{lessonName}
              </div>
            );
          })}
        </div>
      )}

      {/* 詳細表示 */}
      {selectedDate && (
        <div className={styles.detail}>
          <p className={styles.dateTitle}>
            {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
            {selectedDate.getDate()}日
            {filteredSchedules.length > 0 && `   ${filteredSchedules[0].time}`}
          </p>

          {filteredSchedules.length === 0 ? (
            <p className={styles.noReservation}>この日の予約はありません</p>
          ) : (
            <ul className={styles.reservationList}>
              {filteredSchedules.map((s) => (
                <li key={s.id} className={styles.reservationItem}>
                  <div className={styles.reservationInfo}>
                    <span className={styles.lessonMark}>◯</span>
                    <span>
                      {lessonNameMap[s.date]}（{getLessonTypeLabel(s.lessonType)}）｜定員：{s.capacity}
                      {s.memo ? `｜メモ：${s.memo}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
