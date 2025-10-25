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
import styles from './AdminAllReservation.module.css';
import lessonColorPalette from "@/app/component/lessonColer/lessonColors";

type Schedule = {
  id: string;
  date: string;
  time: string;
  capacity: number;
  lessonType: string;
  memo?: string;
  teacherId: string;
  classType: string;
  createdAt?: Timestamp;
};

type Participation = {
  userId: string;
  scheduleId: string;
  isAbsent: boolean;
};

export default function AdminAllReservationPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [lessonNameByScheduleId, setLessonNameByScheduleId] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true); // ← 追加

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1) 全スケジュール取得
        const scheduleSnap = await getDocs(collection(db, 'lessonSchedules'));
        const scheduleList: Schedule[] = scheduleSnap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Schedule, 'id'>),
        }));
        setSchedules(scheduleList);

        // 2) 出欠取得 → 出席のみカウント（userId 去重）
        const participationSnap = await getDocs(collection(db, 'participations'));
        const attendanceSets: Record<string, Set<string>> = {};

        participationSnap.docs.forEach(d => {
          const data = d.data() as Participation;
          if (!data.isAbsent) {
            if (!attendanceSets[data.scheduleId]) attendanceSets[data.scheduleId] = new Set();
            attendanceSets[data.scheduleId].add(data.userId);
          }
        });

        const attendance: Record<string, number> = {};
        Object.entries(attendanceSets).forEach(([sid, set]) => {
          attendance[sid] = set.size;
        });
        setAttendanceMap(attendance);

        // 3) カレンダー色分けのための lessonName マップ
        const lessonMap: Record<string, Set<string>> = {};
        const lessonByScheduleId: Record<string, string> = {};

        for (const s of scheduleList) {
          let lessonName = '未設定';

          if (s.classType === '体験クラス') {
            lessonName = '体験クラス';
          } else {
            const teacherRef = doc(db, 'teacherId', s.teacherId);
            const teacherSnap = await getDoc(teacherRef);
            if (teacherSnap.exists()) {
              const teacherData = teacherSnap.data() as Partial<{ lessonName: string }>;
              lessonName = teacherData.lessonName || '未設定';
            }
          }

          lessonByScheduleId[s.id] = lessonName;

          if (!lessonMap[s.date]) lessonMap[s.date] = new Set();
          lessonMap[s.date].add(lessonName);
        }

        const finalMap: Record<string, string[]> = {};
        Object.entries(lessonMap).forEach(([date, set]) => {
          finalMap[date] = Array.from(set);
        });

        setLessonNameMap(finalMap);
        setLessonNameByScheduleId(lessonByScheduleId);
      } finally {
        setLoading(false);
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
      case 'boulder': return 'ボルダー';
      case 'lead': return 'リード';
      case 'both': return 'ボルダー・リード';
      default: return '不明';
    }
  };

  const filteredSchedules = selectedDate
    ? schedules
        .filter(s => s.date === formatDate(selectedDate))
        .sort((a, b) => a.time.localeCompare(b.time))
    : [];

  // 初回読み込み中は中央にスピナー
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.halfCircleSpinner}>
          <div className={`${styles.spinnerCircle} ${styles.spinnerCircle1}`}></div>
          <div className={`${styles.spinnerCircle} ${styles.spinnerCircle2}`}></div>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>全講師の予約一覧</h1>

      <Calendar
        year={year}
        month={month}
        selectedDates={selectedDate ? [selectedDate] : []}
        availableDates={Object.keys(lessonNameMap)}
        teacherColorMap={lessonNameMap}
        onDateSelect={setSelectedDate}
        goPrev={goPrev}
        goNext={goNext}
        mode="admin"
      />

      <div className={styles.legend}>
        {Object.entries(lessonColorPalette).map(([name, color], idx) => (
          <div key={idx} className={styles.legendItem}>
            <span className={styles.circle} style={{ backgroundColor: color }} />：{name}
          </div>
        ))}
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
                const createdAtStr = (s.createdAt instanceof Timestamp)
                  ? s.createdAt.toDate().toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '日時不明';

                const lessonDisplay =
                  lessonNameByScheduleId[s.id] === '体験クラス'
                    ? '体験クラス'
                    : `${lessonNameByScheduleId[s.id]}（${getLessonTypeLabel(s.lessonType)}）`;

                const attendance = attendanceMap[s.id] || 0;
                const isFull = attendance >= s.capacity;

                return (
                  <li key={s.id} className={styles.reservationItem}>
                    <div className={styles.reservationInfo}>
                      <div className={styles.lessonName}>{lessonDisplay}</div>
                      <div className={styles.timeAndCapacity}>
                        {s.time}｜定員：{s.capacity}（あと {Math.max(0, s.capacity - attendance)}名）
                        {isFull && <span className={styles.fullLabel}>満員</span>}
                      </div>
                      <div className={styles.createdAt}>作成日時：{createdAtStr}</div>
                      {s.memo && <div className={styles.memo}>メモ：{s.memo}</div>}
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
