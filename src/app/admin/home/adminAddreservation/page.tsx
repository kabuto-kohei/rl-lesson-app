'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import styles from './AdminAddReservation.module.css';

export default function AdminAddReservationPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [time, setTime] = useState("");
  const [lessonType, setLessonType] = useState('');
  const [memo, setMemo] = useState('');
  const [capacity, setCapacity] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setTeacherId(params.get('teacherId'));
    }
  }, []);

  const handleDateSelect = (date: Date) => {
    if (multiSelectMode) {
      setSelectedDates((prev) =>
        prev.some((d) => d.toDateString() === date.toDateString())
          ? prev.filter((d) => d.toDateString() !== date.toDateString())
          : [...prev, date]
      );
    } else {
      setSelectedDates([date]);
    }
  };

  const handleAddSchedule = async () => {
    if (selectedDates.length === 0 || !teacherId || !lessonType || capacity === '') {
      alert("日付・種別・定員は必須です");
      return;
    }

    const capacityNum = Number(capacity);
    if (isNaN(capacityNum) || capacityNum < 0) {
      alert("定員は0以上の数値で入力してください");
      return;
    }

    if (!time) {
      alert("開始時間は必須です");
      return;
    }

    let successCount = 0;

    for (const date of selectedDates) {
      const dateStr = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).replaceAll('/', '-');

      const q = query(
        collection(db, 'lessonSchedules'),
        where('teacherId', '==', teacherId),
        where('date', '==', dateStr),
        where('lessonType', '==', lessonType),
        where('time', '==', time)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) continue;

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
        successCount++;
      } catch (err) {
        console.error(`${dateStr} 登録失敗`, err);
      }
    }

    alert(`${successCount}件の予約枠を登録しました`);
    setSelectedDates([]);
    setTime("");
    setLessonType('');
    setMemo('');
    setCapacity('');
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>予約枠の追加</h1>

      <button
        className={styles.toggleButton}
        onClick={() => setMultiSelectMode((m) => !m)}
      >
        {multiSelectMode ? '1日選択に戻す' : '一括選択モード'}
      </button>

      <div className={styles.calendarWrapper}>
        <Calendar
          year={year}
          month={month}
          selectedDates={selectedDates}
          onDateSelect={handleDateSelect}
          availableDates={[]} // admin は全日選択可能
          goPrev={() => {
            if (month === 0) {
              setYear((y) => y - 1);
              setMonth(11);
            } else {
              setMonth((m) => m - 1);
            }
          }}
          goNext={() => {
            if (month === 11) {
              setYear((y) => y + 1);
              setMonth(0);
            } else {
              setMonth((m) => m + 1);
            }
          }}
          mode="admin"
        />
      </div>

      <label>
        <span>開始時間</span>
        <select value={time} onChange={(e) => setTime(e.target.value)} className={styles.input}>
          <option value="">選択してください</option>
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
          disabled={selectedDates.length === 0 || !lessonType || capacity === ''}
          className={styles.button}
        >
          この日程を登録
        </button>
      </div>
    </main>
  );
}
