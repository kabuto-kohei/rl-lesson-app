export function getCalendarMatrix(year: number, month: number): (Date | null)[] {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startDay = start.getDay();
    const daysInMonth = end.getDate();
  
    const dates: (Date | null)[] = [];
  
    // 前の月の空白
    for (let i = 0; i < startDay; i++) {
      dates.push(null);
    }
  
    // 日付
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(new Date(year, month, d));
    }
  
    // 後ろの空白を追加（7の倍数にする）
    while (dates.length % 7 !== 0) {
      dates.push(null);
    }
  
    return dates;
  }
  