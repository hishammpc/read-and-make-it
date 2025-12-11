// PDF utility functions

// MPC Logo path
export const MPC_LOGO_PATH = '/mpclogo.jpeg';

// Load image as base64 for PDF embedding
export async function loadImageAsBase64(imagePath: string): Promise<string> {
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
        const dataURL = canvas.toDataURL('image/jpeg');
        resolve(dataURL);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imagePath;
  });
}

// Add MPC logo to PDF document
export async function addLogoToPDF(
  doc: any,
  x: number = 14,
  y: number = 10,
  width: number = 25,
  height: number = 25
): Promise<void> {
  try {
    const logoBase64 = await loadImageAsBase64(MPC_LOGO_PATH);
    doc.addImage(logoBase64, 'JPEG', x, y, width, height);
  } catch (error) {
    console.error('Failed to add logo to PDF:', error);
    // Continue without logo if it fails
  }
}
