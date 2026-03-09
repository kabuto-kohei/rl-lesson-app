'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase';
import { resolveUserId } from '@/lib/session/resolveUserId';
import {
  resolveActorIdentity,
  resolveActorKeyForWrite,
} from '@/lib/session/resolveActorIdentity';
import {
  doc,
  documentId,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import Calendar from '@/app/component/Calendar/Calendar';
import LoadingProgress from '@/app/component/LoadingProgress/LoadingProgress';
import FadeInSection from '@/app/component/motion/FadeInSection';
import styles from './page.module.css';
import { chunkArray } from '@/lib/firestore/chunkArray';

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

type LoadingState = {
  progress: number;
  label: string;
};

export default function UserAllReservationPage() {
  const params = useParams();
  const userId = resolveUserId(params.userId);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [participations, setParticipations] = useState<ParticipationView[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [busySet, setBusySet] = useState<Set<string>>(new Set()); // トグル処理の連打ガード
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    progress: 20,
    label: '参加情報を読み込んでいます',
  });

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
      setLoading(true);
      setLoadingState({ progress: 20, label: '参加情報を読み込んでいます' });

      try {
        const { actorKey } = resolveActorIdentity();
        const mergedDocs: Array<{
          id: string;
          data: { userId?: string; scheduleId: string; isAbsent: boolean; createdAt?: { toDate: () => Date } };
        }> = [];
        const seenDocIds = new Set<string>();

        // 1) 自分の出欠全件（legacy userId + new actorKey を併読）
        if (userId) {
          const qPartLegacy = query(collection(db, 'participations'), where('userId', '==', userId));
          const legacySnap = await getDocs(qPartLegacy);
          legacySnap.docs.forEach((d) => {
            if (seenDocIds.has(d.id)) return;
            seenDocIds.add(d.id);
            mergedDocs.push({
              id: d.id,
              data: d.data() as { userId?: string; scheduleId: string; isAbsent: boolean; createdAt?: { toDate: () => Date } },
            });
          });
        }

        if (actorKey) {
          const qPartActor = query(collection(db, 'participations'), where('actorKey', '==', actorKey));
          const actorSnap = await getDocs(qPartActor);
          actorSnap.docs.forEach((d) => {
            if (seenDocIds.has(d.id)) return;
            seenDocIds.add(d.id);
            mergedDocs.push({
              id: d.id,
              data: d.data() as { userId?: string; scheduleId: string; isAbsent: boolean; createdAt?: { toDate: () => Date } },
            });
          });
        }

        if (mergedDocs.length === 0) {
          if (!userId && !actorKey) {
            return;
          }
          setParticipations([]);
          setLessonNameMap({});
          return;
        }

        // 2) 同一 scheduleId を去重（最新 createdAt を採用）
        const latestBySchedule = new Map<string, ParticipationRow>();
        for (const d of mergedDocs) {
          const data = d.data;
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

        const scheduleIds = Array.from(new Set(rows.map((row) => row.scheduleId)));
        if (scheduleIds.length === 0) {
          setParticipations([]);
          setLessonNameMap({});
          return;
        }

        setLoadingState({ progress: 55, label: '日程情報を読み込んでいます' });

        // 3) 表示用に schedule / teacher をまとめて解決
        const scheduleMap = new Map<string, {
          date: string;
          time: string;
          lessonType: string;
          teacherId: string;
        }>();

        for (const ids of chunkArray(scheduleIds, 10)) {
          const schedSnap = await getDocs(
            query(
              collection(db, 'lessonSchedules'),
              where(documentId(), 'in', ids)
            )
          );
          schedSnap.docs.forEach((scheduleDoc) => {
            const scheduleData = scheduleDoc.data() as {
              date: string;
              time: string;
              lessonType: string;
              teacherId: string;
            };
            scheduleMap.set(scheduleDoc.id, scheduleData);
          });
        }

        const teacherIds = Array.from(
          new Set(
            Array.from(scheduleMap.values())
              .map((schedule) => schedule.teacherId)
              .filter((teacherId): teacherId is string => typeof teacherId === 'string' && teacherId.length > 0)
          )
        );
        const lessonNameByTeacherId = new Map<string, string>();

        for (const ids of chunkArray(teacherIds, 10)) {
          const teacherSnap = await getDocs(
            query(
              collection(db, 'teacherId'),
              where(documentId(), 'in', ids)
            )
          );
          teacherSnap.docs.forEach((teacherDoc) => {
            const teacherData = teacherDoc.data() as Partial<{ lessonName: string }>;
            lessonNameByTeacherId.set(teacherDoc.id, teacherData.lessonName ?? '未設定');
          });
        }

        setLoadingState({ progress: 85, label: '表示を準備しています' });

        const results: ParticipationView[] = [];
        for (const r of rows) {
          const sched = scheduleMap.get(r.scheduleId);
          if (!sched) continue;
          const lessonName = lessonNameByTeacherId.get(sched.teacherId) ?? '未設定';

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
        setLoadingState({ progress: 100, label: '表示を準備しています' });
      } finally {
        setLoading(false);
      }
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
        const actorKeyForWrite = resolveActorKeyForWrite(userId);
        const updatePayload: { isAbsent: boolean; actorKey: string; userId?: string } = {
          isAbsent: nextIsAbsent,
          actorKey: actorKeyForWrite,
        };
        if (userId) {
          updatePayload.userId = userId;
        }
        await updateDoc(doc(db, 'participations', p.id), updatePayload);

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
            const rollbackPayload: { isAbsent: boolean; actorKey: string; userId?: string } = {
              isAbsent: true,
              actorKey: actorKeyForWrite,
            };
            if (userId) {
              rollbackPayload.userId = userId;
            }
            await updateDoc(doc(db, 'participations', p.id), rollbackPayload);
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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingProgress progress={loadingState.progress} label={loadingState.label} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>参加予定</h1>

      <div className={styles.calendarSection}>
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
      </div>

      {!selectedDate && (
        <p className={styles.helperText}>日付を選ぶと参加予定の詳細が表示されます。</p>
      )}

      {selectedDate && (
        <FadeInSection>
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
        </FadeInSection>
      )}
    </div>
  );
}
