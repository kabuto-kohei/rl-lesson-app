'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
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
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

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

      const bookingSnap = await getDocs(collection(db, 'bookings'));
      const bookings = bookingSnap.docs.map(doc => doc.data() as Booking);
      const bookingMap: Record<string, string[]> = {};
      bookings.forEach(b => {
        if (!bookingMap[b.scheduleId]) bookingMap[b.scheduleId] = [];
        bookingMap[b.scheduleId].push(b.userId);
      });
      setBookingsMap(bookingMap);

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

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    try {
      await updateDoc(
        doc(db, 'lessonSchedules', editingSchedule.id),
        {
          date: editingSchedule.date,
          time: editingSchedule.time,
          capacity: editingSchedule.capacity,
          lessonType: editingSchedule.lessonType,
          memo: editingSchedule.memo || '',
        }
      );

      setSchedules((prev) =>
        prev.map((s) =>
          s.id === editingSchedule.id ? editingSchedule : s
        )
      );

      alert('更新しました');
      setEditingSchedule(null);
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新に失敗しました');
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
                className={styles.editButton}
                onClick={() => setEditingSchedule(s)}
              >
                編集
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

      {editingSchedule && (
        <div
          className={styles.modalOverlay}
          onClick={() => setEditingSchedule(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>スケジュール編集</h2>

            <label>
              日付:
              <input
                type="date"
                value={editingSchedule.date}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, date: e.target.value })
                }
              />
            </label>

            <label>
              時間:
              <input
                type="text"
                value={editingSchedule.time}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, time: e.target.value })
                }
              />
            </label>

            <label>
              種別:
              <select
                value={editingSchedule.lessonType}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, lessonType: e.target.value })
                }
              >
                <option value="">選択してください</option>
                <option value="boulder">ボルダー</option>
                <option value="lead">リード</option>
                <option value="both">両方</option>
              </select>
            </label>

            <label>
              定員:
              <input
                type="number"
                value={editingSchedule.capacity}
                onChange={(e) =>
                  setEditingSchedule({
                    ...editingSchedule,
                    capacity: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </label>

            <label>
              メモ:
              <input
                type="text"
                value={editingSchedule.memo || ''}
                onChange={(e) =>
                  setEditingSchedule({
                    ...editingSchedule,
                    memo: e.target.value,
                  })
                }
              />
            </label>

            <div className={styles.modalActions}>
              <button onClick={handleSaveEdit}>保存</button>
              <button onClick={() => setEditingSchedule(null)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
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
