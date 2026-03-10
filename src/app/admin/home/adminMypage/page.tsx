'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import LoadingProgress from '@/app/component/LoadingProgress/LoadingProgress';
import FadeInSection from '@/app/component/motion/FadeInSection';
import styles from './AdminMypage.module.css';
import { buildMonthDateRange } from '@/lib/date/monthDateRange';

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
  actorKey?: string;
  scheduleId: string;
  isAbsent: boolean;
};

type User = {
  id: string;
  name: string;
};

type LoadingState = {
  progress: number;
  label: string;
};

export default function AdminMypagePage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [participantsMap, setParticipantsMap] = useState<
    Record<string, { attended: string[]; absent: string[] }>
  >({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
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
    const params = new URLSearchParams(window.location.search);
    const id = params.get('teacherId');
    if (id) {
      setTeacherId(id);
      return;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!teacherId) return;

    const fetchData = async () => {
      setLoading(true);
      setLoadingState({ progress: 20, label: '日程を読み込んでいます' });

      try {
        const { monthStart, monthEnd } = buildMonthDateRange(year, month);
        // 対象講師のスケジュール
        const scheduleSnap = await getDocs(
          query(
            collection(db, 'lessonSchedules'),
            where('date', '>=', monthStart),
            where('date', '<=', monthEnd)
          )
        );
        const scheduleList = scheduleSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => (s as Schedule).teacherId === teacherId) as Schedule[];
        setSchedules(scheduleList);
        const scheduleIds = scheduleList.map((s) => s.id);

        // teacherId -> lessonName マップ
        const teacherSnap = await getDocs(collection(db, 'teacherId'));
        const teacherMap: Record<string, string> = {};
        teacherSnap.docs.forEach((d) => {
          const data = d.data() as Partial<{ lessonName: string }>;
          teacherMap[d.id] = data.lessonName || '未設定';
        });

        // カレンダー表示用：date -> lessonName[]（重複除去）
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

        setLoadingState({ progress: 55, label: '参加情報を読み込んでいます' });

        // ユーザー表示名
        const userSnap = await getDocs(collection(db, 'users'));
        const users: Record<string, string> = {};
        userSnap.docs.forEach((d) => {
          const u = d.data() as Partial<User>;
          const displayName = u.name || '名前不明';
          users[d.id] = displayName;
          users[`u:${d.id}`] = displayName;
        });
        setUserMap(users);

        // 出欠を読み込み（scheduleId 内で participantKey を去重）
        const participantData: Record<string, { attended: string[]; absent: string[] }> = {};
        // scheduleId -> { attended:Set, absent:Set } で一旦去重
        const tmpSetMap: Record<string, { attended: Set<string>; absent: Set<string> }> = {};

        if (scheduleIds.length > 0) {
          for (const ids of chunkScheduleIds(scheduleIds, 10)) {
            const participationSnap = await getDocs(
              query(
                collection(db, 'participations'),
                where('scheduleId', 'in', ids)
              )
            );

            participationSnap.docs.forEach((d) => {
              const data = d.data() as Participation;
              const participantKey = data.actorKey ?? data.userId;
              if (!participantKey) return;

              if (!tmpSetMap[data.scheduleId]) {
                tmpSetMap[data.scheduleId] = { attended: new Set(), absent: new Set() };
              }
              if (data.isAbsent) {
                tmpSetMap[data.scheduleId].absent.add(participantKey);
                // 参加とおやすみが同時に存在しないよう排他（保険）
                tmpSetMap[data.scheduleId].attended.delete(participantKey);
              } else {
                tmpSetMap[data.scheduleId].attended.add(participantKey);
                tmpSetMap[data.scheduleId].absent.delete(participantKey);
              }
            });
          }
        }

        Object.entries(tmpSetMap).forEach(([sid, sets]) => {
          participantData[sid] = {
            attended: Array.from(sets.attended),
            absent: Array.from(sets.absent),
          };
        });

        setParticipantsMap(participantData);
        setLoadingState({ progress: 100, label: '表示を準備しています' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId, year, month]);

  const handleDeleteSchedule = async (scheduleId: string) => {
    const ok = window.confirm('この予約枠と関連する出欠情報をすべて削除しますか？');
    if (!ok) return;

    // スケジュール本体削除
    await deleteDoc(doc(db, 'lessonSchedules', scheduleId));

    // 関連出欠は scheduleId でクエリして削除（全件取得→絞り込みをやめて効率化）
    const qPart = query(collection(db, 'participations'), where('scheduleId', '==', scheduleId));
    const participationSnap = await getDocs(qPart);
    for (const d of participationSnap.docs) {
      await deleteDoc(doc(db, 'participations', d.id));
    }

    // ローカル状態更新
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    setParticipantsMap((prev) => {
      const copy = { ...prev };
      delete copy[scheduleId];
      return copy;
    });
  };

  const handleSaveEdit = async (updated: Schedule) => {
    await updateDoc(doc(db, 'lessonSchedules', updated.id), {
      time: updated.time,
      capacity: updated.capacity,
      memo: updated.memo,
      lessonType: updated.lessonType,
    });

    setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingSchedule(null);
  };

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => a.date.localeCompare(b.date)),
    [schedules]
  );
  const filteredSchedules = useMemo(
    () => (selectedDate ? sortedSchedules.filter((s) => s.date === selectedDate) : []),
    [sortedSchedules, selectedDate]
  );
  const reservedDates = useMemo(() => Object.keys(lessonNameMap), [lessonNameMap]);
  const resolveParticipantName = (participantKey: string) => {
    if (userMap[participantKey]) {
      return userMap[participantKey];
    }

    if (participantKey.startsWith('u:')) {
      const legacyUserId = participantKey.slice(2);
      if (legacyUserId && userMap[legacyUserId]) {
        return userMap[legacyUserId];
      }
    }

    return '名前不明';
  };

  if (loading) {
    return (
      <main className={styles.loadingContainer}>
        <LoadingProgress progress={loadingState.progress} label={loadingState.label} />
      </main>
    );
  }

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
            const nextDate = formatToLocalDateString(date);
            setSelectedDate((prev) => (prev === nextDate ? null : nextDate));
          }}
          goPrev={() =>
            month === 0 ? (setYear((y) => y - 1), setMonth(11)) : setMonth((m) => m - 1)
          }
          goNext={() =>
            month === 11 ? (setYear((y) => y + 1), setMonth(0)) : setMonth((m) => m + 1)
          }
          mode="admin"
        />
      </div>

      {!selectedDate && (
        <p className={styles.helperText}>カレンダーの日付を選択すると詳細が表示されます</p>
      )}

      {selectedDate && (
        <FadeInSection className={styles.cardList}>
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
                <div className={styles.actionRow}>
                  <button className={styles.editButton} onClick={() => setEditingSchedule(s)}>
                    編集
                  </button>
                  <button className={styles.deleteButton} onClick={() => handleDeleteSchedule(s.id)}>
                    削除
                  </button>
                </div>
                <p className={styles.label}>参加者：</p>
                <ul className={styles.participants}>
                  {attendance.map((participantKey) => (
                    <li key={participantKey}>{resolveParticipantName(participantKey)}</li>
                  ))}
                </ul>
                {absentees.length > 0 && (
                  <>
                    <p className={styles.label}>おやすみ：</p>
                    <ul className={styles.participants}>
                      {absentees.map((participantKey) => (
                        <li key={participantKey}>{resolveParticipantName(participantKey)}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
          {filteredSchedules.length === 0 && (
            <p className={styles.emptyText}>この日に登録された日程はありません。</p>
          )}
        </FadeInSection>
      )}

      {editingSchedule && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>{formatDate(editingSchedule.date)} の編集</h2>

            <label>
              時間：
              <input
                type="text"
                value={editingSchedule.time}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, time: e.target.value })
                }
              />
            </label>

            <label>
              定員：
              <input
                type="number"
                value={editingSchedule.capacity}
                onChange={(e) =>
                  setEditingSchedule({
                    ...editingSchedule,
                    capacity: Number(e.target.value),
                  })
                }
              />
            </label>

            <label>
              種別：
              <select
                value={editingSchedule.lessonType}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, lessonType: e.target.value })
                }
              >
                <option value="boulder">ボルダー</option>
                <option value="lead">リード</option>
                <option value="both">両方</option>
              </select>
            </label>

            <label>
              メモ：
              <input
                type="text"
                value={editingSchedule.memo || ''}
                onChange={(e) =>
                  setEditingSchedule({ ...editingSchedule, memo: e.target.value })
                }
              />
            </label>

            <div className={styles.modalActions}>
              <button onClick={() => handleSaveEdit(editingSchedule)}>保存</button>
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
  const youbi = '日月火水木金土'[d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${youbi}）`;
}

function formatToLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
