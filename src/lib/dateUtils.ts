import { format, parseISO, isAfter, isBefore, addDays, startOfYear, endOfYear } from 'date-fns';

export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
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
