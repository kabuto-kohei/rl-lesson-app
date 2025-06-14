'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/page';
import styles from './AdminAddReservation.module.css';
import BackButton from "@/app/component/BackButton/BackButton";

export default function AdminAddReservationPage() {
  const searchParams = useSearchParams();
  const teacherId = searchParams.get("teacherId");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [time, setTime] = useState("");
  const [lessonType, setLessonType] = useState('');
  const [memo, setMemo] = useState('');
  const [capacity, setCapacity] = useState('');

  const handleAddSchedule = async () => {
    if (!selectedDate || !teacherId || !lessonType || capacity === '') {
      alert("日付・種別・定員は必須です");
      return;
    }

    const capacityNum = Number(capacity);
    if (isNaN(capacityNum) || capacityNum < 0) {
      alert("定員は0以上の数値で入力してください");
      return;
    }

    const dateStr = selectedDate.toISOString().split("T")[0];

    const q = query(
      collection(db, 'lessonSchedules'),
      where('teacherId', '==', teacherId),
      where('date', '==', dateStr),
      where('lessonType', '==', lessonType)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      alert('同じ日付・種別の予約枠がすでに存在します');
      return;
    }

    try {
      await addDoc(collection(db, 'lessonSchedules'), {
        teacherId,
        date: dateStr,
        time,
        lessonType,
        capacity: capacityNum,
        memo,
        createdAt: Timestamp.now(),
      });
      alert(`${dateStr} の予約枠を追加しました`);
      setTime("");
      setLessonType('');
      setMemo('');
      setCapacity('');
    } catch (error) {
      console.error("登録エラー:", error);
      alert("登録に失敗しました");
    }
  };

  return (
    <main className={styles.container}>
      <BackButton href={`/admin/home/${teacherId}`} />
      <h1 className={styles.heading}>予約枠の追加</h1>

      <div className={styles.calendarWrapper}>
        <Calendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          availableDates={[]}
          onDateSelect={setSelectedDate}
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

      <label>
          <span>開始時間</span>
          <select value={time} onChange={(e) => setTime(e.target.value)} className={styles.input}>
            {Array.from({ length: (22.5 - 9 + 1) * 2 }).map((_, i) => {
              const hour = 9 + Math.floor(i / 2);
              const minute = i % 2 === 0 ? "00" : "30";
              const h = String(hour).padStart(2, "0");
              const timeStr = `${h}:${minute}`;
              return (
                <option key={timeStr} value={timeStr}>
                  {timeStr}
                </option>
              );
            })}
          </select>
        </label>

      <div className={styles.formWrapper}>
        <div className={styles.formGroup}>
          <label className={styles.label}>種別</label>
          <select
            value={lessonType}
            onChange={(e) => setLessonType(e.target.value)}
            className={styles.input}
          >
            <option value="">選択してください</option>
            <option value="boulder">ボルダー</option>
            <option value="lead">リード</option>
            <option value="both">両方</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>定員</label>
          <select
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={styles.input}
          >
            <option value="">選択してください</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>{num}名</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>メモ（任意）</label>
          <textarea className={styles.input}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            placeholder="例：セットの試登など"
          />
        </div>

        <button
          onClick={handleAddSchedule}
          disabled={!selectedDate || !lessonType || capacity === ''}
          className={styles.button}
        >
          この日程を登録
        </button>
      </div>
    </main>
  );
}
