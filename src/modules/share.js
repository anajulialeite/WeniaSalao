/**
 * share.js — Sharing and download module
 * Handles image download and WhatsApp sharing with composed result.
 */

const WHATSAPP_NUMBER = '5561995012806';

/**
 * Download the result canvas as a JPEG image.
 * @param {HTMLCanvasElement} canvas - Canvas to export
 * @param {string} [filename='salao-wenia-simulacao.jpg'] - Download filename
 */
export function downloadResult(canvas, filename = 'salao-wenia-simulacao.jpg') {
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open WhatsApp with pre-filled message.
 * @param {string} [customMessage] - Optional custom message
 */
export function shareViaWhatsApp(customMessage) {
  const message = customMessage || 'Olá! Fiz uma simulação no app e gostaria de agendar!';
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Share using the Web Share API (if available).
 * Falls back to download if not supported.
 * @param {HTMLCanvasElement} canvas - Canvas to share
 */
export async function shareNative(canvas) {
  if (!canvas) return;

  // Check if Web Share API with files is supported
  if (navigator.canShare) {
    try {
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      const file = new File([blob], 'salao-wenia-simulacao.jpg', { type: 'image/jpeg' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Salão Wenia — Simulação',
          text: 'Olha minha simulação de cabelo! 💇‍♀️',
          files: [file],
        });
        return;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share failed, falling back to download:', err);
      } else {
        return; // User cancelled
      }
    }
  }

  // Fallback: download
  downloadResult(canvas);
}

/**
 * Create a before/after comparison image.
 * @param {HTMLCanvasElement} beforeCanvas
 * @param {HTMLCanvasElement} afterCanvas
 * @returns {HTMLCanvasElement} - Side-by-side comparison
 */
export function createComparisonImage(beforeCanvas, afterCanvas) {
  const gap = 4;
  const labelH = 32;
  const w = beforeCanvas.width + afterCanvas.width + gap;
  const h = Math.max(beforeCanvas.height, afterCanvas.height) + labelH;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  // Before
  ctx.drawImage(beforeCanvas, 0, labelH);

  // After
  ctx.drawImage(afterCanvas, beforeCanvas.width + gap, labelH);

  // Labels
  ctx.font = '600 16px "Outfit", sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('ANTES', beforeCanvas.width / 2, 22);

  ctx.fillStyle = '#D4AF37';
  ctx.fillText('DEPOIS', beforeCanvas.width + gap + afterCanvas.width / 2, 22);

  // Watermark
  ctx.font = '400 11px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.textAlign = 'right';
  ctx.fillText('Salão Wenia • simulador virtual', w - 8, h - 8);

  return canvas;
}
