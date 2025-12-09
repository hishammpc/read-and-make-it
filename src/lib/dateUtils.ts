import { format, parseISO, isAfter, isBefore, addDays, startOfYear, endOfYear } from 'date-fns';

// Malaysian month names
const MALAY_MONTHS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
];

export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

// Format date in Malaysian style: "12 Oktober 2025"
export function formatMalaysianDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const day = dateObj.getDate();
    const month = MALAY_MONTHS[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error('Error formatting Malaysian date:', error);
    return '';
  }
}

// Format date range in Malaysian style: "12 - 14 Oktober 2025" or "12 Oktober - 14 November 2025"
export function formatMalaysianDateRange(startDate: string | Date, endDate: string | Date): string {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    const startDay = start.getDate();
    const startMonth = MALAY_MONTHS[start.getMonth()];
    const startYear = start.getFullYear();

    const endDay = end.getDate();
    const endMonth = MALAY_MONTHS[end.getMonth()];
    const endYear = end.getFullYear();

    // Same month and year
    if (start.getMonth() === end.getMonth() && startYear === endYear) {
      return `${startDay} - ${endDay} ${startMonth} ${startYear}`;
    }
    // Same year, different month
    if (startYear === endYear) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
    }
    // Different year
    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  } catch (error) {
    console.error('Error formatting Malaysian date range:', error);
    return '';
  }
}

// Parse date string safely without timezone shift
export function parseDateSafe(date: string | Date): Date {
  if (date instanceof Date) return date;
  // If it's a datetime string, parse it directly
  if (date.includes('T')) {
    return parseISO(date);
  }
  // If it's just a date (YYYY-MM-DD), create date at noon to avoid timezone issues
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'PPP p');
}

export function isDateAfter(date: string | Date, compareDate: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const compareDateObj = typeof compareDate === 'string' ? parseISO(compareDate) : compareDate;
  return isAfter(dateObj, compareDateObj);
}

export function isDateBefore(date: string | Date, compareDate: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const compareDateObj = typeof compareDate === 'string' ? parseISO(compareDate) : compareDate;
  return isBefore(dateObj, compareDateObj);
}

export function addDaysToDate(date: string | Date, days: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addDays(dateObj, days);
}

export function getCurrentYearRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfYear(now),
    end: endOfYear(now),
  };
}

export function isWithinCurrentYear(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const { start, end } = getCurrentYearRange();
  return isAfter(dateObj, start) && isBefore(dateObj, end);
}
