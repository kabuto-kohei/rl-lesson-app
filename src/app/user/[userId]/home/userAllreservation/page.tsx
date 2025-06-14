'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase';
import { collection, getDocs, query, where, doc, getDoc, deleteDoc } from 'firebase/firestore';
import Calendar from '@/app/component/Calendar/page';
import styles from './page.module.css';
import BackButton from '@/app/component/BackButton/BackButton';

export default function UserAllReservationPage() {
    const params = useParams();
    const userId = typeof params.userId === 'string' ? params.userId : '';
    
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  
  type Reservation = {
    id: string;
    date: string;
    time: string;
    lessonType: string;
    lessonName: string;
  };
    
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchReservations = async () => {
      if (!userId) return;
      const q = query(collection(db, 'bookings'), where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const results = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const scheduleRef = doc(db, 'lessonSchedules', data.scheduleId);
          const scheduleSnap = await getDoc(scheduleRef);
      
          if (!scheduleSnap.exists()) return null;
      
          const schedule = scheduleSnap.data();
          const teacherRef = doc(db, 'teacherId', schedule.teacherId);
          const teacherSnap = await getDoc(teacherRef);
      
          return {
            id: docSnap.id,
            date: schedule.date,
            time: schedule.time,
            lessonType: schedule.lessonType,
            lessonName: teacherSnap.exists() ? teacherSnap.data().lessonName : '未設定',
          };
        })
      );
      

      const filtered: Reservation[] = results.filter((r): r is Reservation => r !== null);
      setReservations(filtered);
      const uniqueDates = [...new Set(filtered.map((r) => r.date))];
      setAvailableDates(uniqueDates);
    };
    fetchReservations();
  }, [userId]);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const filteredReservations = reservations.filter((r) => r.date === selectedDateStr);

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

  const handleDelete = async (reservationId: string) => {
    const confirmDelete = window.confirm('この予約を削除しますか？');
    if (!confirmDelete) return;
  
    try {
      await deleteDoc(doc(db, 'bookings', reservationId));
      alert('予約を削除しました');
      // 削除後の再取得
      setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };
  

  return (
    <div className={styles.container}>
      <BackButton href={`/user/${userId}/home`} />
      <h1 className={styles.heading}>予約確認</h1>
  
      <Calendar
        year={year}
        month={month}
        selectedDate={selectedDate}
        availableDates={availableDates}
        onDateSelect={setSelectedDate}
        goPrev={goPrev}
        goNext={goNext}
        mode="user"
      />
  
      {selectedDate && (
        <div className={styles.detail}>
          <p className={styles.dateTitle}>
            {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
          </p>
  
          {filteredReservations.length === 0 ? (
            <p className={styles.noReservation}>この日に予約はありません</p>
          ) : (
            <ul className={styles.reservationList}>
              {filteredReservations.map((r) => (
                <li key={r.id} className={styles.reservationItem}>
                  <div className={styles.reservationInfo}>
                    <span className={styles.lessonMark}>◯</span>
                    <span>{r.lessonName}：{r.time}（{getLessonTypeLabel(r.lessonType)}）</span>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className={styles.deleteButton}>
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}