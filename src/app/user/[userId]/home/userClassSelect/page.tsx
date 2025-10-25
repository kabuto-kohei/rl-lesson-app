'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import Calendar from '@/app/component/Calendar/Calendar';
import styles from './page.module.css';
import { useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import lessonColorPalette from "@/app/component/lessonColer/lessonColors";

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
  classType: string;
  createdAt?: { toDate: () => Date };
};

export default function UserClassSelectPage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string[]>>({});
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [participatedScheduleIds, setParticipatedScheduleIds] = useState<string[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, number>>({});

  // ローディング状態
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(true);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(false);

  // 連打ガード
  const [busySet, setBusySet] = useState<Set<string>>(new Set());
  const withBusy = async (sid: string, fn: () => Promise<void>) => {
    if (busySet.has(sid)) return;
    setBusySet(prev => new Set(prev).add(sid));
    try {
      await fn();
    } finally {
      setBusySet(prev => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
    }
  };

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const snapshot = await getDocs(collection(db, 'teacherId'));
        const data = snapshot.docs
          .map((docSnap) => {
            const d = docSnap.data() as { name: string; ClassType: string };
            return {
              id: docSnap.id,
              name: d.name,
              classType: d.ClassType || '未設定',
            };
          })
          .filter((teacher) => teacher.classType !== '体験クラス');
        setTeachers(data);
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  // 配列を10件ずつに分割（where('in') の制限対策）
  const chunk = <T,>(arr: T[], size = 10): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, (i + 1) * size)
    );

  const handleSubmit = async () => {
    if (!selectedTeacherId) {
      alert('クラスを選択してください');
      return;
    }
    setShowCalendar(true);
    setSelectedDate(null);
    setLoadingSchedules(true);

    try {
      // 対象講師のスケジュール取得
      const qSchedules = query(
        collection(db, 'lessonSchedules'),
        where('teacherId', '==', selectedTeacherId)
      );
      const scheduleSnap = await getDocs(qSchedules);
      const scheduleList = (scheduleSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Schedule[]).filter((s) => s.classType !== '体験クラス');
      setSchedules(scheduleList);

      // --- 出席人数（isAbsent:false）のユーザー去重 & 自分の参加済み去重 ---
      const attendanceSets: Record<string, Set<string>> = {}; // scheduleId -> Set<userId>
      const participatedIdsSet = new Set<string>();

      const scheduleIds = scheduleList.map(s => s.id);
      if (scheduleIds.length > 0) {
        for (const ids of chunk(scheduleIds, 10)) {
          const qPart = query(
            collection(db, 'participations'),
            where('scheduleId', 'in', ids)
          );
          const partSnap = await getDocs(qPart);
          partSnap.docs.forEach((d) => {
            const data = d.data() as { userId: string; scheduleId: string; isAbsent?: boolean };
            const sid = data.scheduleId;

            if (data.userId === userId) {
              participatedIdsSet.add(sid);
            }
            if (!data.isAbsent) {
              if (!attendanceSets[sid]) attendanceSets[sid] = new Set();
              attendanceSets[sid].add(data.userId);
            }
          });
        }
      }

      const attendanceCounter: Record<string, number> = {};
      Object.entries(attendanceSets).forEach(([sid, set]) => {
        attendanceCounter[sid] = set.size;
      });

      setParticipatedScheduleIds(Array.from(participatedIdsSet));
      setAttendanceMap(attendanceCounter);

      // カレンダーの◯色用：date → lessonName[] マップ
      const tempMap: Record<string, Set<string>> = {};
      for (const s of scheduleList) {
        const teacherRef = doc(db, 'teacherId', s.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const teacherSnapData = teacherSnap.data() as Partial<{ lessonName: string }>;
        const lessonName = teacherSnap.exists()
          ? teacherSnapData.lessonName || '未設定'
          : '未設定';

        if (!tempMap[s.date]) tempMap[s.date] = new Set();
        tempMap[s.date].add(lessonName);
      }
      const finalMap: Record<string, string[]> = {};
      Object.entries(tempMap).forEach(([date, set]) => {
        finalMap[date] = Array.from(set);
      });
      setLessonNameMap(finalMap);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleParticipate = async (scheduleId: string) => {
    if (!userId) {
      alert('ユーザーIDが見つかりません');
      return;
    }
    if (participatedScheduleIds.includes(scheduleId)) {
      alert('すでに登録済みです');
      return;
    }

    try {
      // 定員チェック
      const scheduleSnap = await getDoc(doc(db, 'lessonSchedules', scheduleId));
      if (!scheduleSnap.exists()) return;
      const schedule = scheduleSnap.data() as { capacity?: number };
      const capacity = schedule.capacity || 0;

      const snap = await getDocs(
        query(
          collection(db, 'participations'),
          where('scheduleId', '==', scheduleId),
          where('isAbsent', '==', false)
        )
      );
      if (snap.size >= capacity) {
        alert('このスケジュールは満員です');
        return;
      }

      // 固定IDで一意化（重複カウント防止）
      await setDoc(
        doc(db, 'participations', `${scheduleId}_${userId}`),
        {
          userId,
          scheduleId,
          isAbsent: false,
          createdAt: Timestamp.now(),
        },
        { merge: false }
      );

      // ローカルの出席人数を即時反映
      setParticipatedScheduleIds((prev) => [...prev, scheduleId]);
      setAttendanceMap(prev => ({
        ...prev,
        [scheduleId]: (prev[scheduleId] || 0) + 1,
      }));

      // 事後検証：満員オーバーならロールバック
      const qAfter = query(
        collection(db, 'participations'),
        where('scheduleId', '==', scheduleId),
        where('isAbsent', '==', false)
      );
      const afterSnap = await getDocs(qAfter);
      const scheduleSnap2 = await getDoc(doc(db, 'lessonSchedules', scheduleId));
      const capacity2 = (scheduleSnap2.data() as { capacity?: number })?.capacity ?? 0;

      if (afterSnap.size > capacity2) {
        await setDoc(
          doc(db, 'participations', `${scheduleId}_${userId}`),
          {
            userId,
            scheduleId,
            isAbsent: true,
            createdAt: Timestamp.now(),
          },
          { merge: true }
        );
        setParticipatedScheduleIds(prev => prev.filter(id => id !== scheduleId));
        setAttendanceMap(prev => ({
          ...prev,
          [scheduleId]: Math.max(0, (prev[scheduleId] || 1) - 1),
        }));
        alert('同時操作により満員になったため、参加登録を取り消しました。');
      } else {
        alert('参加登録しました');
      }
    } catch (err) {
      console.error('参加登録エラー:', err);
      alert('登録に失敗しました');
    }
  };

  const handleAbsent = async (scheduleId: string) => {
    if (!userId) {
      alert('ユーザーIDが見つかりません');
      return;
    }
    if (participatedScheduleIds.includes(scheduleId)) {
      alert('すでに登録済みです');
      return;
    }

    try {
      await setDoc(
        doc(db, 'participations', `${scheduleId}_${userId}`),
        {
          userId,
          scheduleId,
          isAbsent: true,
          createdAt: Timestamp.now(),
        },
        { merge: false }
      );

      alert('おやすみとして登録しました');
      setParticipatedScheduleIds((prev) => [...prev, scheduleId]);
      // おやすみは出席人数に影響しないので attendanceMap は変更なし
    } catch (err) {
      console.error('おやすみ登録エラー:', err);
      alert('登録に失敗しました');
    }
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

  // ① 初回：講師取得中は画面中央にスピナー
  if (loadingTeachers) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.halfCircleSpinner}>
          <div className={styles.circle + ' ' + styles.circle1}></div>
          <div className={styles.circle + ' ' + styles.circle2}></div>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>クラスを選択してください</h2>

      <select
        value={selectedTeacherId}
        onChange={(e) => {
          setSelectedTeacherId(e.target.value);
          setShowCalendar(false);
          setSelectedDate(null);
          setSchedules([]);
          setLessonNameMap({});
          setParticipatedScheduleIds([]);
          setAttendanceMap({});
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

      <button onClick={handleSubmit} className={styles.button} disabled={!selectedTeacherId || loadingSchedules}>
        {loadingSchedules ? '読み込み中…' : 'このクラスの日程を表示'}
      </button>

      {/* ② カレンダー表示領域：選択後の読み込み中はスピナー */}
      {showCalendar && (
        loadingSchedules ? (
          <div className={styles.loadingBlock}>
            <div className={styles.halfCircleSpinner}>
              <div className={styles.circle + ' ' + styles.circle1}></div>
              <div className={styles.circle + ' ' + styles.circle2}></div>
            </div>
            <p>Loading...</p>
          </div>
        ) : (
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
                  const color = lessonColorPalette[lessonName] || '#ccc';
                  return (
                    <div key={idx} className={styles.legendItem}>
                      <span className={styles.circleDot} style={{ backgroundColor: color }} />
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
                    {filteredSchedules.map((s) => {
                      const currentAttend = attendanceMap[s.id] || 0;
                      const isFull = currentAttend >= s.capacity;
                      const alreadyJoined = participatedScheduleIds.includes(s.id);
                      const isBusy = busySet.has(s.id);

                      return (
                        <li key={s.id} className={styles.reservationItem}>
                          <div className={styles.reservationInfo}>
                            <div className={styles.row}>
                              <div className={styles.timeAndCapacity}>
                                {s.time}｜定員：{s.capacity}（あと {Math.max(0, s.capacity - currentAttend)}名）
                                {isFull && <span className={styles.fullLabel}>満員</span>}
                              </div>
                              <div className={styles.lessonType}>
                                {getLessonTypeLabel(s.lessonType)}
                              </div>
                            </div>
                            {s.memo && (
                              <div className={styles.memo}>メモ：{s.memo}</div>
                            )}
                          </div>
                          <div className={styles.buttonGroup}>
                            <button
                              className={styles.button}
                              onClick={() => withBusy(s.id, () => handleParticipate(s.id))}
                              disabled={alreadyJoined || isFull || isBusy}
                            >
                              {isBusy ? '処理中…' : '参加する'}
                            </button>
                            <button
                              className={styles.absentButton}
                              onClick={() => withBusy(s.id, () => handleAbsent(s.id))}
                              disabled={alreadyJoined || isBusy}
                            >
                              {isBusy ? '処理中…' : 'おやすみ'}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
