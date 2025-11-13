import Papa from 'papaparse';

export interface CSVUserRow {
  BIL: string;
  NAMA: string;
  JAWATAN: string;
  EMEL: string;
}

export interface ParsedUser {
  name: string;
  email: string;
  position: string;
  rowNumber: number;
}

export interface CSVParseResult {
  users: ParsedUser[];
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

/**
 * Parse CSV file and extract user data
 * Skips first 2 rows (headers) and validates data
 */
export async function parseUserCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVUserRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const users: ParsedUser[] = [];
        const errors: Array<{ row: number; email: string; error: string }> = [];

        results.data.forEach((row, index) => {
          const rowNumber = index + 1;

          // Skip first 2 rows (they are headers in the actual CSV)
          if (rowNumber <= 2) {
            return;
          }

          // Validate required fields
          const name = row.NAMA?.trim();
          const email = row.EMEL?.trim().toLowerCase();
          const position = row.JAWATAN?.trim();

          if (!name || name === '') {
            errors.push({
              row: rowNumber,
              email: email || 'unknown',
              error: 'Name is required',
            });
            return;
          }

          if (!email || email === '') {
            errors.push({
              row: rowNumber,
              email: 'unknown',
              error: 'Email is required',
            });
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push({
              row: rowNumber,
              email: email,
              error: 'Invalid email format',
            });
            return;
          }

          users.push({
            name,
            email,
            position: position || '',
            rowNumber,
          });
        });

        resolve({ users, errors });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Download error report as CSV
 */
export function downloadErrorReport(
  errors: Array<{ row: number; email: string; error: string }>,
  fileName: string = 'import-errors.csv'
): void {
  const csv = Papa.unparse(errors, {
    columns: ['row', 'email', 'error'],
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
