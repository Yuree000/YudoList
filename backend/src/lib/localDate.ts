const DAY_IN_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
  return new Date(year, month - 1, day);
}

export function getLocalToday(): string {
  return formatLocalDate(new Date());
}

export function shiftLocalDate(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function addMonthsToLocalDate(dateStr: string, months: number): string {
  const date = parseLocalDate(dateStr);
  date.setMonth(date.getMonth() + months);
  return formatLocalDate(date);
}

export function getLocalDayStartMs(dateStr: string): number {
  return parseLocalDate(dateStr).getTime();
}

export function getLocalDayEndExclusiveMs(dateStr: string): number {
  return getLocalDayStartMs(dateStr) + DAY_IN_MS;
}

export function getMondayFirstWeekday(input: Date | string): number {
  const date = typeof input === 'string' ? parseLocalDate(input) : input;
  return (date.getDay() + 6) % 7;
}
