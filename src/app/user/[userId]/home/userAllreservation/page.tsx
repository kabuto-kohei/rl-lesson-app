'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import Calendar from '@/app/component/Calendar/Calendar';
import styles from './page.module.css';

type ParticipationRow = {
  id: string;            // participations コレクションのドキュメントID（固定ID想定: `${scheduleId}_${userId}`）
  scheduleId: string;
  isAbsent: boolean;
  createdAt?: { toDate: () => Date };
};

type ParticipationView = {
  id: string;            // participationId
  scheduleId: string;
  date: string;
  time: string;
  lessonType: string;
  lessonName: string;
  isAbsent: boolean;
};

export default function UserAllReservationPage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [participations, setParticipations] = useState<ParticipationView[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [busySet, setBusySet] = useState<Set<string>>(new Set()); // トグル処理の連打ガード

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    if (busySet.has(id)) return;
    setBusySet(prev => new Set(prev).add(id));
    try {
      await fn();
    } finally {
      setBusySet(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  useEffect(() => {
    const fetchParticipations = async () => {
      if (!userId) return;

      // 1) 自分の出欠全件
      const qPart = query(collection(db, 'participations'), where('userId', '==', userId));
      const snap = await getDocs(qPart);

      // 2) 同一 scheduleId を去重（最新 createdAt を採用）
      const latestBySchedule = new Map<string, ParticipationRow>();
      for (const d of snap.docs) {
        const data = d.data() as { userId: string; scheduleId: string; isAbsent: boolean; createdAt?: { toDate: () => Date } };
        const row: ParticipationRow = {
          id: d.id,
          scheduleId: data.scheduleId,
          isAbsent: !!data.isAbsent,
          createdAt: data.createdAt,
        };
        const prev = latestBySchedule.get(data.scheduleId);
        const currTime = row.createdAt?.toDate().getTime() ?? 0;
        const prevTime = prev?.createdAt?.toDate().getTime() ?? -1;
        if (!prev || currTime >= prevTime) {
          latestBySchedule.set(data.scheduleId, row);
        }
      }
      const rows = Array.from(latestBySchedule.values());

      // 3) 表示用に schedule / teacher を解決
      const results: ParticipationView[] = [];
      for (const r of rows) {
        const schedRef = doc(db, 'lessonSchedules', r.scheduleId);
        const schedSnap = await getDoc(schedRef);
        if (!schedSnap.exists()) continue;

        const sched = schedSnap.data() as {
          date: string; time: string; lessonType: string; teacherId: string;
        };

        const teacherRef = doc(db, 'teacherId', sched.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const teacherData = teacherSnap.data() as Partial<{ lessonName: string }>;
        const lessonName = teacherSnap.exists() ? (teacherData.lessonName ?? '未設定') : '未設定';

        results.push({
          id: r.id,
          scheduleId: r.scheduleId,
          date: sched.date,
          time: sched.time,
          lessonType: sched.lessonType,
          lessonName,
          isAbsent: r.isAbsent,
        });
      }

      // 4) カレンダー凡例（date → lessonName[]）
      const map: Record<string, string[]> = {};
      results.forEach((v) => {
        if (!map[v.date]) map[v.date] = [];
        if (!map[v.date].includes(v.lessonName)) {
          map[v.date].push(v.lessonName);
        }
      });

      setParticipations(results);
      setLessonNameMap(map);
    };

    fetchParticipations();
  }, [userId]);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const filtered = participations
    .filter((p) => p.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

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

  // 参加⇄おやすみ トグル（定員チェックつき ＆ 同時実行緩和の再検証つき）
  const toggleAbsent = async (p: ParticipationView) => {
    await withBusy(p.id, async () => {
      try {
        const nextIsAbsent = !p.isAbsent;

        // 「おやすみ → 参加」に戻すときのみ定員チェック
        if (nextIsAbsent === false) {
          const schedRef = doc(db, 'lessonSchedules', p.scheduleId);
          const schedSnap = await getDoc(schedRef);
          if (!schedSnap.exists()) {
            alert('スケジュールが見つかりません');
            return;
          }
          const sched = schedSnap.data() as { capacity?: number };
          const capacity = sched.capacity ?? 0;

          // 現在の参加人数（isAbsent:false）を数える
          const qAttend = query(
            collection(db, 'participations'),
            where('scheduleId', '==', p.scheduleId),
            where('isAbsent', '==', false)
          );
          const attendSnap = await getDocs(qAttend);
          const currentAttend = attendSnap.size;

          if (currentAttend >= capacity) {
            alert('このスケジュールは満員のため、参加に戻せません。');
            return;
          }
        }

        // 書き込み（固定ID運用でも ID は p.id を更新）
        await updateDoc(doc(db, 'participations', p.id), { isAbsent: nextIsAbsent });

        // 楽観更新でUI反映
        setParticipations(prev =>
          prev.map(item => item.id === p.id ? { ...item, isAbsent: nextIsAbsent } : item)
        );

        // 追加の緩和策：直後にもう一度定員越えを検出したら巻き戻す
        if (nextIsAbsent === false) {
          const qAttend2 = query(
            collection(db, 'participations'),
            where('scheduleId', '==', p.scheduleId),
            where('isAbsent', '==', false)
          );
          const afterSnap = await getDocs(qAttend2);

          const schedSnap2 = await getDoc(doc(db, 'lessonSchedules', p.scheduleId));
          const capacity2 = (schedSnap2.data() as { capacity?: number })?.capacity ?? 0;

          if (afterSnap.size > capacity2) {
            // 同時操作によりオーバーしたので元に戻す
            await updateDoc(doc(db, 'participations', p.id), { isAbsent: true });
            setParticipations(prev =>
              prev.map(item => item.id === p.id ? { ...item, isAbsent: true } : item)
            );
            alert('同時操作により満員になったため、参加に戻せませんでした。');
          }
        }
      } catch (err) {
        console.error('おやすみ更新エラー:', err);
        alert('変更に失敗しました');
      }
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>参加予定</h1>

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

      {selectedDate && (
        <div className={styles.detail}>
          <p className={styles.dateTitle}>
            {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
          </p>

          {filtered.length === 0 ? (
            <p className={styles.noReservation}>この日に参加予定はありません</p>
          ) : (
            <ul className={styles.reservationList}>
              {filtered.map((p) => (
                <li key={p.id} className={styles.reservationItem}>
                  <div className={styles.reservationInfo}>
                    <span className={styles.lessonMark}></span>
                    <span>
                      {p.lessonName}（{getLessonTypeLabel(p.lessonType)}）
                    </span>
                    <span className={styles.timeText}>　{p.time}</span>
                  </div>
                  <button
                    onClick={() => toggleAbsent(p)}
                    disabled={busySet.has(p.id)}
                    className={`${styles.statusButton} ${p.isAbsent ? styles.statusAbsent : styles.statusParticipated}`}
                  >
                    {busySet.has(p.id) ? '処理中…' : p.isAbsent ? '参加' : 'おやすみ'}
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