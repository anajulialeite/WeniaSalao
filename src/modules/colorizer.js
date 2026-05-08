/**
 * colorizer.js — Hair coloring module
 * Applies color to hair region using Canvas blend modes.
 */

/**
 * Apply a color to the hair region of an image.
 * @param {HTMLCanvasElement} sourceCanvas - Canvas with the original image
 * @param {ImageData} hairMask - Hair mask from segmenter (white = hair)
 * @param {string} color - CSS color string (hex or rgb)
 * @param {number} intensity - Opacity 0-100
 * @returns {HTMLCanvasElement} - New canvas with colored hair
 */
export function applyHairColor(sourceCanvas, hairMask, color, intensity) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Result canvas starts as a copy of the original
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = width;
  resultCanvas.height = height;
  const resultCtx = resultCanvas.getContext('2d');
  resultCtx.drawImage(sourceCanvas, 0, 0);

  // Create mask canvas
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  maskCtx.putImageData(hairMask, 0, 0);

  // Create color layer canvas
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext('2d');

  // Fill with the chosen color
  colorCtx.fillStyle = color;
  colorCtx.fillRect(0, 0, width, height);

  // Apply mask: only keep color where hair is
  colorCtx.globalCompositeOperation = 'destination-in';
  colorCtx.drawImage(maskCanvas, 0, 0);

  // Apply the colored mask onto the original with 'overlay' blend
  const opacity = Math.max(0.1, Math.min(0.9, intensity / 100));
  resultCtx.globalAlpha = opacity;
  resultCtx.globalCompositeOperation = 'overlay';
  resultCtx.drawImage(colorCanvas, 0, 0);

  // Second pass with 'soft-light' for more natural look
  resultCtx.globalAlpha = opacity * 0.5;
  resultCtx.globalCompositeOperation = 'soft-light';
  resultCtx.drawImage(colorCanvas, 0, 0);

  // Reset
  resultCtx.globalAlpha = 1;
  resultCtx.globalCompositeOperation = 'source-over';

  return resultCanvas;
}

/**
 * Hair color palette — popular salon colors for female hair
 */
export const HAIR_COLORS = [
  { name: 'Loiro Platinado', color: '#F5E6C8' },
  { name: 'Loiro Mel', color: '#C8A45C' },
  { name: 'Loiro Dourado', color: '#DAA520' },
  { name: 'Ruivo Cobre', color: '#B87333' },
  { name: 'Ruivo Intenso', color: '#CC4422' },
  { name: 'Castanho Claro', color: '#8B6914' },
  { name: 'Castanho Chocolate', color: '#5C3317' },
  { name: 'Preto Azulado', color: '#1B1B3A' },
  { name: 'Vermelho Borgonha', color: '#722F37' },
  { name: 'Rosa Quartz', color: '#E8A0BF' },
  { name: 'Lilás', color: '#C8A2D4' },
  { name: 'Azul Petróleo', color: '#2A5F7A' },
  { name: 'Verde Esmeralda', color: '#2E8B57' },
  { name: 'Marsala', color: '#8E4A49' },
];
