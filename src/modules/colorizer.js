/**
 * colorizer.js — Hair coloring module
 * Applies color to hair region using Canvas blend modes.
 * Features: feathered mask edges, multi-pass blending for natural results.
 */

const offscreen = {
  blur: null,
  rawMask: null,
  color: null
};

function getOffscreenCanvas(name, w, h) {
  if (!offscreen[name]) {
    offscreen[name] = document.createElement('canvas');
  }
  const canvas = offscreen[name];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  return { canvas, ctx };
}

/**
 * Apply Gaussian-like blur to a mask for softer edges (feathering).
 * Uses multiple box blurs via canvas for performance.
 * @param {HTMLCanvasElement} maskCanvas - Canvas with the hair mask
 * @param {number} radius - Blur radius in pixels
 * @returns {HTMLCanvasElement} - Blurred mask canvas
 */
function featherMask(maskCanvas, radius = 3) {
  const w = maskCanvas.width;
  const h = maskCanvas.height;

  const { canvas: blurCanvas, ctx: blurCtx } = getOffscreenCanvas('blur', w, h);

  // Apply CSS filter blur (fast, GPU-accelerated)
  blurCtx.filter = `blur(${radius}px)`;
  blurCtx.drawImage(maskCanvas, 0, 0);
  blurCtx.filter = 'none';

  return blurCanvas;
}

/**
 * Apply a color to the hair region of an image.
 * Uses feathered mask edges and multi-pass blending for natural results.
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

  // Create raw mask canvas
  const { canvas: rawMaskCanvas, ctx: rawMaskCtx } = getOffscreenCanvas('rawMask', width, height);
  rawMaskCtx.putImageData(hairMask, 0, 0);

  // Feather the mask edges for smoother transitions
  const featherRadius = Math.max(2, Math.round(Math.min(width, height) / 150));
  const maskCanvas = featherMask(rawMaskCanvas, featherRadius);

  // Create color layer canvas
  const { canvas: colorCanvas, ctx: colorCtx } = getOffscreenCanvas('color', width, height);

  // Fill with the chosen color
  colorCtx.fillStyle = color;
  colorCtx.fillRect(0, 0, width, height);

  // Apply feathered mask: only keep color where hair is
  colorCtx.globalCompositeOperation = 'destination-in';
  colorCtx.drawImage(maskCanvas, 0, 0);

  // Determine blending strategy based on color brightness
  const rgb = hexToRgb(color);
  const brightness = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;

  const opacity = Math.max(0.1, Math.min(0.9, intensity / 100));

  // Pass 1: 'overlay' — main color application
  resultCtx.globalAlpha = opacity;
  resultCtx.globalCompositeOperation = 'overlay';
  resultCtx.drawImage(colorCanvas, 0, 0);

  // Pass 2: conditional based on brightness
  if (brightness < 0.3) {
    // Dark colors: use 'multiply' for deeper, richer tones
    resultCtx.globalAlpha = opacity * 0.6;
    resultCtx.globalCompositeOperation = 'multiply';
    resultCtx.drawImage(colorCanvas, 0, 0);
  } else if (brightness > 0.7) {
    // Light colors: use 'screen' to lighten dark hair
    resultCtx.globalAlpha = opacity * 0.4;
    resultCtx.globalCompositeOperation = 'screen';
    resultCtx.drawImage(colorCanvas, 0, 0);
  } else {
    // Mid-range colors: soft-light for natural blending
    resultCtx.globalAlpha = opacity * 0.5;
    resultCtx.globalCompositeOperation = 'soft-light';
    resultCtx.drawImage(colorCanvas, 0, 0);
  }

  // Pass 3: subtle color enrichment with 'color' blend mode
  resultCtx.globalAlpha = opacity * 0.25;
  resultCtx.globalCompositeOperation = 'color';
  resultCtx.drawImage(colorCanvas, 0, 0);

  // Reset
  resultCtx.globalAlpha = 1;
  resultCtx.globalCompositeOperation = 'source-over';

  return resultCanvas;
}

/**
 * Convert hex color to RGB object.
 * @param {string} hex - Hex color string
 * @returns {{ r: number, g: number, b: number }}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 128, g: 128, b: 128 };
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
