'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import styles from './page.module.css';

type Schedule = {
  id: string;
  date: string;
  time: string;
  lessonType: string;
  teacherId: string;
  capacity: number;
  memo?: string;
};

export default function TrialReservationPage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dateToLessonNameMap, setDateToLessonNameMap] = useState<Record<string, string[]>>({});
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});

  const [showModal, setShowModal] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', memberId: '', phone: '', note: '' });

  useEffect(() => {
    const fetchSchedulesAndBookings = async () => {
      const q = query(
        collection(db, 'lessonSchedules'),
        where('classType', '==', '体験クラス')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Schedule[];
      setSchedules(data);

      const lessonMap: Record<string, Set<string>> = {};
      const nameMap: Record<string, string> = {};

      for (const s of data) {
        const teacherRef = doc(db, 'teacherId', s.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};
        const lesson = teacherData.lessonName || '未設定';

        nameMap[s.teacherId] = lesson;
        if (!lessonMap[s.date]) lessonMap[s.date] = new Set();
        lessonMap[s.date].add(lesson);
      }

      const finalMap: Record<string, string[]> = {};
      Object.entries(lessonMap).forEach(([date, set]) => {
        finalMap[date] = Array.from(set);
      });

      setDateToLessonNameMap(finalMap);

      const bookingSnapshot = await getDocs(collection(db, 'bookings'));
      const counts: Record<string, number> = {};
      bookingSnapshot.docs.forEach(doc => {
        const booking = doc.data();
        const sid = booking.scheduleId;
        counts[sid] = (counts[sid] || 0) + 1;
      });
      setBookingCounts(counts);
    };

    fetchSchedulesAndBookings();
  }, []);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const dailySchedules = schedules.filter(s => s.date === selectedDateStr);
  const groupedSchedules: Record<string, Schedule[]> = {};
  for (const schedule of dailySchedules) {
    if (!groupedSchedules[schedule.teacherId]) {
      groupedSchedules[schedule.teacherId] = [];
    }
    groupedSchedules[schedule.teacherId].push(schedule);
  }

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

  const handleConfirmReserve = async () => {
    if (!userId || !selectedScheduleId || !formData.name || !formData.phone || !formData.note) return;
    await addDoc(collection(db, 'bookings'), {
      scheduleId: selectedScheduleId,
      userId,
      name: formData.name,
      memberId: formData.memberId,
      phone: formData.phone,
      note: formData.note,
      createdAt: Timestamp.now(),
    });
    alert('予約が完了しました');
    setShowModal(false);
    setFormData({ name: '', memberId: '', phone: '', note: '' });
    setSelectedScheduleId(null);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>ファンクラス体験予約</h1>
      <p className={styles.subheading}>ファンクラスの体験予約カレンダーになります。</p>

      <Calendar
        year={year}
        month={month}
        selectedDates={selectedDate ? [selectedDate] : []}
        availableDates={Object.keys(dateToLessonNameMap)}
        teacherColorMap={dateToLessonNameMap}
        onDateSelect={setSelectedDate}
        goPrev={goPrev}
        goNext={goNext}
        mode="user"
      />

      {selectedDate && (
        <div className={styles.detail}>
          <p className={styles.dateTitle}>選択日: {selectedDate.toLocaleDateString()}</p>
          <p className={styles.subnote}>※ファンクラスの体験のみ表示</p>

          {dailySchedules.length === 0 ? (
            <p className={styles.noReservation}>この日に予約枠はありません</p>
          ) : (
            <div className={styles.groupedList}>
              {Object.entries(groupedSchedules).map(([teacherId, scheduleList]) => (
                <div key={teacherId} className={styles.teacherGroup}>
                  <h3 className={styles.teacherName}>体験クラス</h3>
                  <ul className={styles.reservationList}>
                    {scheduleList.map((s) => {
                      const booked = bookingCounts[s.id] || 0;
                      const remaining = s.capacity - booked;
                      return (
                        <li key={s.id} className={styles.reservationItem}>
                          <div className={styles.reservationInfo}>
                            <div className={styles.lessonType}>{getLessonTypeLabel(s.lessonType)}</div>
                            <div className={styles.timeAndCapacity}>{s.time}｜定員：{s.capacity}｜残り：{remaining}</div>
                            {s.memo && <div className={styles.memo}>メモ：{s.memo}</div>}
                          </div>
                          <button
                            className={styles.reserveButton}
                            onClick={() => {
                              setSelectedScheduleId(s.id);
                              setShowModal(true);
                            }}
                            disabled={remaining <= 0}
                          >
                            {remaining <= 0 ? '満席' : '選択'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>予約情報を入力</h3>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>名前（必須）</label>
              <input type="text" className={styles.inputField} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>会員番号（任意）</label>
              <input type="text" className={styles.inputField} value={formData.memberId} onChange={(e) => setFormData({ ...formData, memberId: e.target.value })} />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>電話番号（必須）</label>
              <input type="tel" className={styles.inputField} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>備考</label>
              <textarea className={styles.inputField} rows={2} placeholder="年齢やボルダリング経験等" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
            </div>

            <button className={styles.modalButton} onClick={handleConfirmReserve} disabled={!formData.name || !formData.phone }>予約</button>
            <div className={styles.modalClose} onClick={() => setShowModal(false)}>キャンセル</div>
          </div>
        </div>
      )}
    </div>
  );
}