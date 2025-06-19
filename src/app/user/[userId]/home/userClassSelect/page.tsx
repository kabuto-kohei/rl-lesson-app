'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import styles from './page.module.css';
import BackButton from '@/app/component/BackButton/BackButton';

// Firestore の teacherId ドキュメントに対応する型
type Teacher = {
  id: string;
  name: string;
  classType: string;
};

type Schedule = {
  id: string;
  date: string;
  time: string;
  capacity: number;
  lessonType: string;
  memo?: string;
  teacherId: string;
  createdAt?: { toDate: () => Date };
};

export default function UserClassSelectPage() {
  const { userId } = useParams();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      const snapshot = await getDocs(collection(db, 'teacherId'));
      const data = snapshot.docs.map((doc) => {
        const d = doc.data() as { name: string; ClassType: string };
        return {
          id: doc.id,
          name: d.name,
          classType: d.ClassType || '未設定',
        };
      });
      setTeachers(data);
    };
    fetchTeachers();
  }, []);

  const handleSubmit = async () => {
    if (!selectedTeacherId) {
      alert('クラスを選択してください');
      return;
    }
    setShowCalendar(true);
    setSelectedDate(null);

    const q = query(
      collection(db, 'lessonSchedules'),
      where('teacherId', '==', selectedTeacherId)
    );
    const snapshot = await getDocs(q);
    const scheduleList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Schedule[];
    setSchedules(scheduleList);

    const tempMap: Record<string, Set<string>> = {};
    for (const s of scheduleList) {
      const teacherRef = doc(db, 'teacherId', s.teacherId);
      const teacherSnap = await getDoc(teacherRef);
      const lessonName = teacherSnap.exists()
        ? teacherSnap.data().lessonName || '未設定'
        : '未設定';
      if (!tempMap[s.date]) tempMap[s.date] = new Set();
      tempMap[s.date].add(lessonName);
    }
    const finalMap: Record<string, string[]> = {};
    Object.entries(tempMap).forEach(([date, set]) => {
      finalMap[date] = Array.from(set);
    });
    setLessonNameMap(finalMap);
  };

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const filteredSchedules = schedules
  .filter((s) => s.date === selectedDateStr)
  .sort((a, b) => a.time.localeCompare(b.time));

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'boulder': return 'ボルダー';
      case 'lead': return 'リード';
      case 'both': return 'ボルダー・リード';
      default: return '不明';
    }
  };

  const getColorForLesson = (lessonName: string): string => {
    const map: Record<string, string> = {
      'れおスク': '#fca5a5',
      'そらスク': '#93c5fd',
      'かぶスク': '#fcd34d',
      'おーらんスクール': '#34d399',
      '未設定': 'gray',
    };
    return map[lessonName] || '#ccc';
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
      <BackButton href={`/user/${userId}/home`} />
      <h2 className={styles.heading}>クラスを選択してください</h2>
      <select
        value={selectedTeacherId}
        onChange={(e) => {
          setSelectedTeacherId(e.target.value);
          setShowCalendar(false);
          setSelectedDate(null);
          setSchedules([]);
          setLessonNameMap({});
        }}
        className={styles.selectBox}
      >
        <option value="">-- 選択してください --</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.classType}（{teacher.name}）
          </option>
        ))}
      </select>
      <button onClick={handleSubmit} className={styles.button}>
        このクラスの日程を表示
      </button>

      {showCalendar && (
        <>
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

          {lessonNameMap && Object.values(lessonNameMap).length > 0 && (
            <div className={styles.legend}>
              {Array.from(new Set(Object.values(lessonNameMap).flat())).map((lessonName, idx) => {
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

          {selectedDate && (
            <div className={styles.detail}>
              <p className={styles.dateTitle}>
                {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
              </p>

              {filteredSchedules.length === 0 ? (
                <p className={styles.noReservation}>この日のスケジュールはありません</p>
              ) : (
                <ul className={styles.reservationList}>
                  {filteredSchedules.map((s) => (
                    <li key={s.id} className={styles.reservationItem}>
                      <div className={styles.reservationInfo}>
                        <div className={styles.timeAndCapacity}>
                          {s.time}｜定員：{s.capacity}
                        </div>
                        <div className={styles.lessonType}>
                         {getLessonTypeLabel(s.lessonType)}
                        </div>
                        {s.memo && <div className={styles.memo}>メモ：{s.memo}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}