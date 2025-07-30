'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
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

type Participation = {
  userId: string;
  scheduleId: string;
  isAbsent: boolean;
};

type User = {
  id: string;
  name: string;
};

export default function AdminMypagePage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [participantsMap, setParticipantsMap] = useState<Record<string, { attended: string[]; absent: string[] }>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // teacherId取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('teacherId');
    if (id) setTeacherId(id);
  }, []);

  // Firestoreから全データ取得
  useEffect(() => {
    if (!teacherId) return;

    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'lessonSchedules'));
      const scheduleList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => (s as Schedule).teacherId === teacherId) as Schedule[];
      setSchedules(scheduleList);

      const teacherSnap = await getDocs(collection(db, 'teacherId'));
      const teacherMap: Record<string, string> = {};
      teacherSnap.docs.forEach(doc => {
        teacherMap[doc.id] = doc.data().lessonName || '未設定';
      });

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

      const participationSnap = await getDocs(collection(db, 'participations'));
      const participantData: Record<string, { attended: string[]; absent: string[] }> = {};
      participationSnap.docs.forEach(doc => {
        const data = doc.data() as Participation;
        if (!participantData[data.scheduleId]) {
          participantData[data.scheduleId] = { attended: [], absent: [] };
        }
        if (data.isAbsent) {
          participantData[data.scheduleId].absent.push(data.userId);
        } else {
          participantData[data.scheduleId].attended.push(data.userId);
        }
      });
      setParticipantsMap(participantData);

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

  const filteredSchedules = useMemo(() => {
    if (!selectedDate) return sortedSchedules;
    return sortedSchedules.filter(s => s.date === selectedDate);
  }, [sortedSchedules, selectedDate]);

  const reservedDates = useMemo(() => {
    return Object.keys(lessonNameMap);
  }, [lessonNameMap]);

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>マイページ</h1>

      <div className={styles.calendarWrapper}>
        <Calendar
          year={year}
          month={month}
          selectedDates={selectedDate ? [new Date(selectedDate)] : []}
          availableDates={reservedDates}
          teacherColorMap={lessonNameMap}
          onDateSelect={(date) => {
            const iso = formatToLocalDateString(date);
            setSelectedDate(iso);
          }}
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

      {selectedDate && (
        <button className={styles.resetButton} onClick={() => setSelectedDate(null)}>
         日程一覧
        </button>
      )}

      {filteredSchedules.map((s) => {
        const attendance = participantsMap[s.id]?.attended || [];
        const absentees = participantsMap[s.id]?.absent || [];
        const isFull = attendance.length >= s.capacity;

        return (
          <div key={s.id} className={styles.card}>
            <h2 className={styles.date}>📝 {formatDate(s.date)}</h2>
            <p className={styles.detail}>
              時間：{s.time}（定員 {s.capacity}｜参加 {attendance.length}｜休み {absentees.length}）
              {isFull && <span className={styles.fullLabel}>（満員）</span>}
              {s.memo && `｜メモ：${s.memo}`}
            </p>
            <p className={styles.label}>参加者：</p>
            <ul className={styles.participants}>
              {attendance.map(uid => (
                <li key={uid}>{userMap[uid] || '名前不明'}</li>
              ))}
            </ul>
            {absentees.length > 0 && (
              <>
                <p className={styles.label}>おやすみ：</p>
                <ul className={styles.participants}>
                  {absentees.map(uid => (
                    <li key={uid}>{userMap[uid] || '名前不明'}</li>
                  ))}
                </ul>
              </>
            )}
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

function formatToLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
