'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  documentId,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import LoadingProgress from '@/app/component/LoadingProgress/LoadingProgress';
import FadeInSection from '@/app/component/motion/FadeInSection';
import styles from './AdminAllReservation.module.css';
import lessonColorPalette from "@/app/component/lessonColer/lessonColors";
import { buildMonthDateRange } from '@/lib/date/monthDateRange';

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
  userId?: string;
  actorKey?: string;
  scheduleId: string;
  isAbsent: boolean;
};

type LoadingState = {
  progress: number;
  label: string;
};

export default function AdminAllReservationPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [lessonNameByScheduleId, setLessonNameByScheduleId] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    progress: 20,
    label: '日程を読み込んでいます',
  });

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const chunkScheduleIds = (ids: string[], size = 10): string[][] =>
    Array.from({ length: Math.ceil(ids.length / size) }, (_, i) =>
      ids.slice(i * size, (i + 1) * size)
    );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadingState({ progress: 20, label: '日程を読み込んでいます' });
      try {
        // 1) 当月スケジュール取得
        const { monthStart, monthEnd } = buildMonthDateRange(year, month);
        const scheduleSnap = await getDocs(
          query(
            collection(db, 'lessonSchedules'),
            where('date', '>=', monthStart),
            where('date', '<=', monthEnd)
          )
        );
        const scheduleList: Schedule[] = scheduleSnap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Schedule, 'id'>),
        }));
        setSchedules(scheduleList);
        setAttendanceMap({});
        setLoadingState({ progress: 55, label: '講師情報を読み込んでいます' });

        // 2) カレンダー色分けのための lessonName マップ
        const lessonMap: Record<string, Set<string>> = {};
        const lessonByScheduleId: Record<string, string> = {};
        const lessonNameByTeacherId: Record<string, string> = {};

        const requiredTeacherIds = Array.from(
          new Set(
            scheduleList
              .filter((schedule) => schedule.classType !== '体験クラス')
              .map((schedule) => schedule.teacherId)
              .filter((teacherId) => teacherId.length > 0)
          )
        );

        if (requiredTeacherIds.length > 0) {
          for (const ids of chunkScheduleIds(requiredTeacherIds, 10)) {
            const teacherSnap = await getDocs(
              query(
                collection(db, 'teacherId'),
                where(documentId(), 'in', ids)
              )
            );
            teacherSnap.docs.forEach((teacherDoc) => {
              const teacherData = teacherDoc.data() as Partial<{ lessonName: string }>;
              lessonNameByTeacherId[teacherDoc.id] = teacherData.lessonName || '未設定';
            });
          }
        }

        for (const s of scheduleList) {
          const lessonName =
            s.classType === '体験クラス'
              ? '体験クラス'
              : lessonNameByTeacherId[s.teacherId] || '未設定';
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
        setLoadingState({ progress: 85, label: '表示を準備しています' });
      } finally {
        setLoadingState({ progress: 100, label: '表示を準備しています' });
        setLoading(false);
      }
    };

    fetchData();
  }, [year, month]);

  useEffect(() => {
    const fetchAttendanceByDate = async () => {
      if (!selectedDate) {
        setAttendanceMap({});
        return;
      }

      const selectedDateStr = formatDate(selectedDate);
      const scheduleIds = schedules
        .filter((schedule) => schedule.date === selectedDateStr)
        .map((schedule) => schedule.id);

      if (scheduleIds.length === 0) {
        setAttendanceMap({});
        return;
      }

      const attendanceSets: Record<string, Set<string>> = {};
      for (const ids of chunkScheduleIds(scheduleIds, 10)) {
        const participationSnap = await getDocs(
          query(
            collection(db, 'participations'),
            where('scheduleId', 'in', ids)
          )
        );

        participationSnap.docs.forEach((participationDoc) => {
          const data = participationDoc.data() as Participation;
          const participantKey = data.actorKey ?? data.userId;
          if (!participantKey || data.isAbsent) return;

          if (!attendanceSets[data.scheduleId]) {
            attendanceSets[data.scheduleId] = new Set();
          }
          attendanceSets[data.scheduleId].add(participantKey);
        });
      }

      const attendance: Record<string, number> = {};
      Object.entries(attendanceSets).forEach(([scheduleId, participantSet]) => {
        attendance[scheduleId] = participantSet.size;
      });
      setAttendanceMap(attendance);
    };

    fetchAttendanceByDate();
  }, [selectedDate, schedules]);

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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingProgress progress={loadingState.progress} label={loadingState.label} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>全講師の予約一覧</h1>

      <div className={styles.calendarBlock}>
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
              <span className={styles.legendDot} style={{ backgroundColor: color }} />：{name}
            </div>
          ))}
        </div>
      </div>

      {!selectedDate && (
        <p className={styles.helperText}>カレンダーの日付を選択すると、その日の予約詳細が表示されます。</p>
      )}

      {selectedDate && (
        <FadeInSection>
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
        </FadeInSection>
      )}
    </div>
  );
}
