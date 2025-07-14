"use client";

import React from "react";
import styles from "./Calendar.module.css";
import { getCalendarMatrix } from "@/app/component/utils/calendarUtils";

export type CalendarProps = {
  year: number;
  month: number;
  selectedDates?: Date[]; // optional にする（フォールバック対応用）
  availableDates: string[];
  onDateSelect: (date: Date) => void;
  goPrev: () => void;
  goNext: () => void;
  mode?: "user" | "admin";
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
  mode = "user",
  teacherColorMap = {},
}: CalendarProps) {
  const dates = getCalendarMatrix(year, month);

  const isClickable = (dateStr: string) => {
    return mode === "admin" || availableDates.includes(dateStr);
  };

  const lessonColorPalette: Record<string, string> = {
    "れおスク": "#fca5a5",
    "そらスク": "#93c5fd",
    "かぶスク": "#fcd34d",
    "おーらんスクール": "#34d399",
    '体験クラス': '#c4b5fd',
    "未設定": "gray",
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.nav}>
        <button onClick={goPrev}>＜</button>
        <span className={styles.monthLabel}>
          {year}年 {month + 1}月
        </span>
        <button onClick={goNext}>＞</button>
      </div>

      <div className={styles.grid}>
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div
            key={d}
            className={`${styles.dayLabel} ${
              i === 0 ? styles.sunday : i === 6 ? styles.saturday : ""
            }`}
          >
            {d}
          </div>
        ))}

        {dates.map((date, i) => {
          if (!date) return <div key={i} className={styles.dateCell} />;

          const isThisMonth = date.getMonth() === month;
          const iso = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

          const clickable = isThisMonth && isClickable(iso);
          const isSelected = selectedDates.some(
            (d) => d.toDateString() === date.toDateString()
          );
          const isAvailable = availableDates.includes(iso);

          const raw = teacherColorMap?.[iso];
          const lessonNames = Array.isArray(raw) ? raw : [];
          const circleColors = lessonNames
            .slice(0, 4)
            .map((name) => lessonColorPalette[name] || "gray");

          return (
            <div
              key={i}
              className={
                `${styles.dateCell} ` +
                `${isSelected ? styles.selected : ""} ` +
                `${!clickable ? styles.disabled : ""} ` +
                `${!isThisMonth ? styles.outsideMonth : ""}`
              }
              onClick={() => clickable && onDateSelect(date)}
            >
              <div>{date.getDate()}</div>
              {isAvailable && (
                <div className={styles.circleWrapper}>
                  {circleColors.map((color, index) => (
                    <div
                      key={index}
                      className={styles.circleSmall}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
