'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase';
import styles from './page.module.css';
import UserHeader from '@/app/component/Header/Header';

type Schedule = {
  id: string;
  date: string;
  time: string;
  teacherId: string;
  lessonType: string;
  memo: string;
};

export default function UserHomePage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const [userName, setUserName] = useState<string>('ゲスト');
  const [myTeachers, setMyTeachers] = useState<string[]>([]);
  const [lessonNameMap, setLessonNameMap] = useState<Record<string, string>>({});
  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setUserName(data.name || 'ゲスト');
        setMyTeachers(data.myTeachers || []);
      }
    };
    fetchUserData();
  }, [userId]);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!userId) return;

      // ① 予約済みスケジュールIDを取得
      const bookingsSnap = await getDocs(
        query(collection(db, 'bookings'), where('userId', '==', userId))
      );
      const bookedScheduleIds = bookingsSnap.docs.map(doc => doc.data().scheduleId);

      // ② 講師情報取得（lessonName と classType）
      const teacherSnap = await getDocs(collection(db, 'teacherId'));
      const lessonMap: Record<string, string> = {};
      const classTypeMapTemp: Record<string, string> = {};

      teacherSnap.docs.forEach(doc => {
        const data = doc.data();
        lessonMap[doc.id] = data.lessonName || '(未設定スクール名)';
        classTypeMapTemp[doc.id] = data.ClassType || '';
      });
      setLessonNameMap(lessonMap);

      // ③ スケジュール取得＆フィルタ
      const scheduleSnap = await getDocs(collection(db, 'lessonSchedules'));
      const now = new Date();
      const oneWeekLater = new Date();
      oneWeekLater.setDate(now.getDate() + 7);

      const results: Schedule[] = [];

      scheduleSnap.docs.forEach(doc => {
        const data = doc.data();
        const dateObj = new Date(data.date || '');
        const teacherId = data.teacherId || '';
        const classType = classTypeMapTemp[teacherId] || '';

        const isThisWeek = dateObj >= now && dateObj <= oneWeekLater;
        const isReservedClass = bookedScheduleIds.includes(doc.id);
        const isOpenClass =
          ['ファンクラス', 'ミドルクラス'].includes(classType) &&
          myTeachers.includes(teacherId);

        if (isThisWeek && (isReservedClass || isOpenClass)) {
          results.push({
            id: doc.id,
            date: data.date || '',
            time: data.time || '',
            teacherId,
            lessonType: data.lessonType || '',
            memo: data.memo || '',
          });
        }
      });

      results.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setUpcomingSchedules(results);
    };

    fetchSchedules();
  }, [userId, myTeachers]);

  const goTo = (path: string) => {
    if (!userId) {
      alert('ユーザー情報がありません');
      return;
    }
    router.push(`/user/${userId}${path}`);
  };

  return (
    <div className={styles.container}>
      <UserHeader userName={userName} />
        <div className={styles.box}>
          <h2 className={styles.subheading}>今週のMyスクール予定</h2>
          {upcomingSchedules.length === 0 ? (
             <p className={styles.noSchedule}>予定はありません</p>
          ) : (
            <ul className={styles.scheduleList}>
              {upcomingSchedules.map((s) => {
                const date = new Date(s.date);
                const youbi = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                const formatted = `${date.getMonth() + 1}月${date.getDate()}日（${youbi}）`;

                const lessonTypeMap: Record<string, string> = {
                  boulder: 'ボルダー',
                  lead: 'リード',
                  both: 'ボルダー＆リード',
                };
                const typeLabel = lessonTypeMap[s.lessonType] || s.lessonType;

                return (
                  <li key={s.id} className={styles.scheduleItem}>
                    <div className={styles.lessonName}>
                      {lessonNameMap[s.teacherId] || '不明スクール'}
                    </div>
                    <div className={styles.scheduleInfo}>
                      {formatted}{s.time}　（{typeLabel}）
                    </div>
                    {s.memo && (
                      <div className={styles.memo}>
                        メモ：{s.memo}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={styles.box}>
          <h2 className={styles.subheading}>メニュー</h2>
          <button className={`${styles.button} ${styles.classSelectButton}`} onClick={() => goTo('/home/userClassSelect')}>
            スクール日程
          </button>
          <button className={`${styles.button} ${styles.reserveButton}`} onClick={() => goTo('/home/userAddreservation')}>
            体験予約
          </button>
          <button className={`${styles.button} ${styles.confirmButton}`} onClick={() => goTo('/home/userAllreservation')}>
            スクール確認
          </button>
          <button className={`${styles.button} ${styles.userInfoButton}`} onClick={() => goTo('/home/userMypage')}>
            マイページ
          </button>
        </div>
    </div>
  );
}
