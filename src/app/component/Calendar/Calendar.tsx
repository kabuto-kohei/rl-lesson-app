'use client';

import React from 'react';
import styles from './Calendar.module.css';
import { getCalendarMatrix } from '@/app/component/utils/calendarUtils';
import lessonColorPalette from '@/app/component/lessonColer/lessonColors';

export type CalendarProps = {
  year: number;
  month: number;
  selectedDates?: Date[];
  availableDates: string[];
  onDateSelect: (date: Date) => void;
  goPrev: () => void;
  goNext: () => void;
  mode?: 'user' | 'admin';
  teacherColorMap?: Record<string, string[]>;
  teacherId?: string;
  userId?: string;
};

export default function Calendar({
  year,
  month,
  selectedDates = [],
  availableDates,
  onDateSelect,
  goPrev,
  goNext,
  mode = 'user',
  teacherColorMap = {},
}: CalendarProps) {
  const dates = getCalendarMatrix(year, month);

  const isClickable = (dateStr: string): boolean => {
    return mode === 'admin' || availableDates.includes(dateStr);
  };

  return (
    <section className={styles.wrapper}>
      <div className={styles.nav}>
        <button type="button" onClick={goPrev} className={styles.navButton} aria-label="前月">
          ＜
        </button>
        <span className={styles.monthLabel}>
          {year}年 {month + 1}月
        </span>
        <button type="button" onClick={goNext} className={styles.navButton} aria-label="翌月">
          ＞
        </button>
      </div>

      <div className={styles.grid}>
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div
            key={d}
            className={`${styles.dayLabel} ${i === 0 ? styles.sunday : i === 6 ? styles.saturday : ''}`}
          >
            {d}
          </div>
        ))}

        {dates.map((date, i) => {
          if (!date) {
            return <div key={i} className={`${styles.dateCell} ${styles.emptyCell}`} />;
          }

          const isThisMonth = date.getMonth() === month;
          const iso = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

          const clickable = isThisMonth && isClickable(iso);
          const isSelected = selectedDates.some((d) => d.toDateString() === date.toDateString());
          const isAvailable = availableDates.includes(iso);

          const raw = teacherColorMap?.[iso];
          const lessonNames = Array.isArray(raw) ? raw : [];
          const circleColors = lessonNames.slice(0, 4).map((name) => lessonColorPalette[name] || '#9ca3af');

          const className = [
            styles.dateCell,
            isSelected ? styles.selected : '',
            !clickable ? styles.disabled : '',
            !isThisMonth ? styles.outsideMonth : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              type="button"
              key={i}
              className={className}
              onClick={() => clickable && onDateSelect(date)}
              disabled={!clickable}
              aria-label={`${iso}を選択`}
            >
              <span className={styles.dayNumber}>{date.getDate()}</span>
              {isAvailable && (
                <span className={styles.circleWrapper}>
                  {circleColors.map((color, index) => (
                    <span
                      key={`${iso}-${index}`}
                      className={styles.circleSmall}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
