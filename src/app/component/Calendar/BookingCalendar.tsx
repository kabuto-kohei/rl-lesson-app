"use client";

import { useEffect, useState } from "react";
import Calendar from "./Calendar";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

type BookingCalendarProps = {
  teacherId: string;
  userId: string;
  onDateSelect?: (date: Date) => void;
};

export default function BookingCalendar({
  teacherId,
  userId,
  onDateSelect, // ✅ これが必要！
}: BookingCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // スケジュール取得
  useEffect(() => {
    const fetchSchedules = async () => {
      const q = query(
        collection(db, "lessonSchedules"),
        where("teacherId", "==", teacherId)
      );
      const snapshot = await getDocs(q);
      const dates = snapshot.docs.map((doc) => doc.data().date);
      setAvailableDates(dates);
    };

    if (teacherId) fetchSchedules();
  }, [teacherId]);

  const goPrev = () => {
    if (month === 0) {
      setYear((prev) => prev - 1);
      setMonth(11);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const goNext = () => {
    if (month === 11) {
      setYear((prev) => prev + 1);
      setMonth(0);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  return (
    <Calendar
      year={year}
      month={month}
      selectedDates={selectedDate ? [selectedDate] : []}
      availableDates={availableDates}
      onDateSelect={(date) => {
        setSelectedDate(date);
        onDateSelect?.(date);
      }}
      goPrev={goPrev}
      goNext={goNext}
      mode="user"
      teacherId={teacherId}
      userId={userId}
    />
  );
}
