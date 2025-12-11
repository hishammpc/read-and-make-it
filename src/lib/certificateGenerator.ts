import jsPDF from 'jspdf';

const MALAY_MONTHS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
];

function formatMalaysianDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

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
}

export interface CertificateData {
  employeeName: string;
  programTitle: string;
  startDate: string;
  endDate: string;
}

export interface TextPosition {
  employeeName: { x: number; y: number; fontSize: number };
  programTitle: { x: number; y: number; fontSize: number };
  dateRange: { x: number; y: number; fontSize: number };
}

// Default positions (can be adjusted via test page)
export const DEFAULT_POSITIONS: TextPosition = {
  employeeName: { x: 148.5, y: 99, fontSize: 30 },
  programTitle: { x: 148.5, y: 128, fontSize: 20 },
  dateRange: { x: 148.5, y: 142.5, fontSize: 19 },
};

// Load font from URL and convert to base64
async function loadFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return base64;
}

export async function generateCertificate(
  data: CertificateData,
  positions: TextPosition = DEFAULT_POSITIONS,
  preview: boolean = false
): Promise<string | void> {
  const { employeeName, programTitle, startDate, endDate } = data;

  // Create PDF in landscape A4
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  // Load and register Forte font
  let forteLoaded = false;
  try {
    const fontBase64 = await loadFontAsBase64('/Forte.ttf');
    doc.addFileToVFS('Forte.ttf', fontBase64);
    doc.addFont('Forte.ttf', 'Forte', 'normal');
    forteLoaded = true;
  } catch (error) {
    console.warn('Failed to load Forte font, using fallback:', error);
  }

  // Load the certificate template image
  try {
    const templateUrl = '/certificate-template.jpg';
    const img = await loadImage(templateUrl);

    // Add template as background (full page) - use JPEG format since file is actually JPEG
    doc.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);
  } catch (error) {
    console.error('Failed to load certificate template:', error);
    // Fallback: Draw a simple background
    drawFallbackBackground(doc, pageWidth, pageHeight);
  }

  // Add Employee Name - use Forte font if loaded
  if (forteLoaded) {
    doc.setFont('Forte', 'normal');
  } else {
    doc.setFont('helvetica', 'bold');
  }
  doc.setFontSize(positions.employeeName.fontSize);
  doc.setTextColor(0, 0, 0);
  doc.text(employeeName, positions.employeeName.x, positions.employeeName.y, { align: 'center' });

  // Add Program Title - use normal font
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(positions.programTitle.fontSize);
  doc.setTextColor(0, 0, 0);

  const maxWidth = pageWidth - 60; // Leave margins
  const splitTitle = doc.splitTextToSize(programTitle, maxWidth);
  let yPosition = positions.programTitle.y;

  splitTitle.forEach((line: string) => {
    doc.text(line, positions.programTitle.x, yPosition, { align: 'center' });
    yPosition += positions.programTitle.fontSize * 0.4;
  });

  // Add Date Range - use regular font for dates
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(positions.dateRange.fontSize);
  doc.setTextColor(80, 80, 80);
  const dateRange = formatMalaysianDateRange(startDate, endDate);
  doc.text(dateRange, positions.dateRange.x, positions.dateRange.y, { align: 'center' });

  if (preview) {
    // Return as data URL for preview
    return doc.output('dataurlstring');
  } else {
    // Download the PDF
    const filename = `Certificate_${employeeName.replace(/\s+/g, '_')}_${programTitle.replace(/\s+/g, '_').substring(0, 30)}.pdf`;
    doc.save(filename);
  }
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        // Use JPEG format for better compatibility
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = (e) => {
      console.error('Image load error:', e);
      reject(new Error('Failed to load image: ' + url));
    };
    img.src = url;
  });
}

function drawFallbackBackground(doc: jsPDF, pageWidth: number, pageHeight: number) {
  // Simple fallback if template not found
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Border
  doc.setDrawColor(128, 0, 32);
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(128, 0, 32);
  doc.text('CERTIFICATE', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('OF ACHIEVEMENT', pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('This certificate is presented to', pageWidth / 2, 100, { align: 'center' });

  doc.text('for successfully completed the course', pageWidth / 2, 140, { align: 'center' });
}
