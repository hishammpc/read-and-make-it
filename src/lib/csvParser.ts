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
 * Normalize column name to handle variations
 * BIL. -> BIL, removes periods, trims, uppercase
 */
function normalizeColumnName(name: string): string {
  return name.trim().replace(/\./g, '').toUpperCase();
}

/**
 * Parse CSV file and extract user data
 * Handles empty lines, column name variations, and validates data
 */
export async function parseUserCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    // First, read the file as text to preprocess it
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        // Remove empty lines and lines with only commas/whitespace
        const lines = text.split('\n').filter(line => {
          const trimmed = line.trim();
          // Skip empty lines OR lines with only commas/whitespace
          return trimmed !== '' && !trimmed.match(/^[,\s]+$/);
        });

        if (lines.length < 2) {
          reject(new Error('CSV file must have at least a header row and one data row'));
          return;
        }

        // Rejoin the cleaned lines
        const cleanedCSV = lines.join('\n');

        // Parse with PapaParse
        Papa.parse(cleanedCSV, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header: string) => {
            // Normalize headers: BIL. -> BIL, trim, uppercase
            return normalizeColumnName(header);
          },
          complete: (results: any) => {
            const users: ParsedUser[] = [];
            const errors: Array<{ row: number; email: string; error: string }> = [];

            // Get the actual headers from the parsed data
            const headers = results.meta.fields || [];

            // Check if we have the required columns
            const hasNAMA = headers.includes('NAMA');
            const hasEMEL = headers.includes('EMEL');

            if (!hasNAMA || !hasEMEL) {
              reject(new Error(
                `CSV missing required columns. Found: [${headers.join(', ')}]. Expected: NAMA, EMEL`
              ));
              return;
            }

            results.data.forEach((row: any, index: number) => {
              // Row number in the original file (accounting for header)
              const rowNumber = index + 2; // +1 for 0-index, +1 for header row

              // Extract and validate fields
              const name = row.NAMA?.trim();
              const email = row.EMEL?.trim().toLowerCase();
              const position = row.JAWATAN?.trim();

              // Skip completely empty rows
              if (!name && !email && !position) {
                return;
              }

              // Validate required fields
              if (!name || name === '') {
                errors.push({
                  row: rowNumber,
                  email: email || 'unknown',
                  error: 'Name (NAMA) is required',
                });
                return;
              }

              if (!email || email === '') {
                errors.push({
                  row: rowNumber,
                  email: 'unknown',
                  error: 'Email (EMEL) is required',
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
          error: (error: any) => {
            reject(new Error(`CSV parsing failed: ${error.message}`));
          },
        });
      } catch (error: any) {
        reject(new Error(`Failed to read CSV file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file, 'UTF-8');
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
