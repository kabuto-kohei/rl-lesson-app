export type MonthDateRange = {
  monthStart: string;
  monthEnd: string;
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

export function buildMonthDateRange(year: number, monthIndex: number): MonthDateRange {
  const month = monthIndex + 1;
  const lastDay = new Date(year, month, 0).getDate();

  return {
    monthStart: `${year}-${pad2(month)}-01`,
    monthEnd: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}
