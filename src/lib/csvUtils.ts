// CSV Export utilities

export function downloadCSV(data: any[], filename: string) {
  const csv = arrayToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function arrayToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create header row
  const headerRow = headers.map(escapeCSVValue).join(',');

  // Create data rows
  const dataRows = data.map(row =>
    headers.map(header => escapeCSVValue(row[header])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function formatDataForCSV(data: any[], columns: Record<string, string>): any[] {
  return data.map(item => {
    const formatted: any = {};
    Object.entries(columns).forEach(([key, label]) => {
      formatted[label] = getNestedValue(item, key);
    });
    return formatted;
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
