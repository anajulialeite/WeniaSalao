/**
 * hairstyle.js — Hairstyle overlay module
 * Manages overlay PNG positioning with touch gestures:
 * - Single-finger drag (move position)
 * - Two-finger pinch (scale)
 * - Two-finger rotate (rotation)
 * - UI controls (size buttons, reset, flip)
 */

// ==================== HAIRSTYLE CATALOG ====================
export const HAIRSTYLE_CATALOG = [
  { id: 'curto-01', name: 'Pixie Moderno', category: 'curto', src: null },
  { id: 'curto-02', name: 'Bob Curto', category: 'curto', src: null },
  { id: 'curto-03', name: 'Joãozinho', category: 'curto', src: null },
  { id: 'medio-01', name: 'Lob Ondulado', category: 'medio', src: null },
  { id: 'medio-02', name: 'Chanel', category: 'medio', src: null },
  { id: 'medio-03', name: 'Médio Liso', category: 'medio', src: null },
  { id: 'longo-01', name: 'Longo Liso', category: 'longo', src: null },
  { id: 'longo-02', name: 'Cachos Longos', category: 'longo', src: null },
];

// ==================== STATE ====================
let overlayState = {
  active: false,
  image: null,          // HTMLImageElement of the hairstyle PNG
  hairstyleId: null,    // Current hairstyle ID
  x: 0,                 // Position X (center of image)
  y: 0,                 // Position Y (center of image)
  scale: 1,             // Scale factor
  rotation: 0,          // Rotation in radians
  flipped: false,       // Horizontal flip
  canvasWidth: 0,
  canvasHeight: 0,
};

// Touch tracking
let touchState = {
  isDragging: false,
  isPinching: false,
  startX: 0,
  startY: 0,
  startDist: 0,
  startAngle: 0,
  startScale: 1,
  startRotation: 0,
  lastX: 0,
  lastY: 0,
};

// Callback to redraw
let onUpdateCallback = null;

// ==================== PUBLIC API ====================

/**
 * Initialize the hairstyle overlay system.
 * @param {HTMLElement} container - The canvas container element
 * @param {Function} onUpdate - Callback to trigger re-render
 */
export function initHairstyleOverlay(container, onUpdate) {
  onUpdateCallback = onUpdate;
  setupTouchHandlers(container);
  setupControlButtons();
}

/**
 * Set the canvas dimensions for positioning calculations.
 * @param {number} width
 * @param {number} height
 */
export function setCanvasDimensions(width, height) {
  overlayState.canvasWidth = width;
  overlayState.canvasHeight = height;
}

/**
 * Load and activate a hairstyle overlay.
 * @param {string} hairstyleId - ID from HAIRSTYLE_CATALOG
 * @param {string} imageSrc - URL/path to the PNG
 * @returns {Promise<void>}
 */
export function loadHairstyle(hairstyleId, imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      overlayState.image = img;
      overlayState.hairstyleId = hairstyleId;
      overlayState.active = true;

      // Initial position: centered horizontally, top 25% vertically
      overlayState.x = overlayState.canvasWidth / 2;
      overlayState.y = overlayState.canvasHeight * 0.25;

      // Initial scale: fit hairstyle to ~60% of canvas width
      const targetWidth = overlayState.canvasWidth * 0.6;
      overlayState.scale = targetWidth / img.naturalWidth;
      overlayState.rotation = 0;
      overlayState.flipped = false;

      if (onUpdateCallback) onUpdateCallback();
      resolve();
    };
    img.onerror = () => reject(new Error('Failed to load hairstyle image'));
    img.src = imageSrc;
  });
}

/**
 * Remove the current hairstyle overlay.
 */
export function removeHairstyle() {
  overlayState.active = false;
  overlayState.image = null;
  overlayState.hairstyleId = null;
  if (onUpdateCallback) onUpdateCallback();
}

/**
 * Check if a hairstyle overlay is currently active.
 */
export function isHairstyleActive() {
  return overlayState.active && overlayState.image !== null;
}

/**
 * Get the current hairstyle ID.
 */
export function getActiveHairstyleId() {
  return overlayState.hairstyleId;
}

/**
 * Draw the hairstyle overlay onto a canvas context.
 * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
 * @param {number} canvasDisplayWidth - Displayed width of the canvas element
 * @param {number} canvasDisplayHeight - Displayed height of the canvas element
 */
export function drawHairstyleOverlay(ctx, canvasDisplayWidth, canvasDisplayHeight) {
  if (!overlayState.active || !overlayState.image) return;

  const img = overlayState.image;
  const { x, y, scale, rotation, flipped } = overlayState;

  ctx.save();

  // Move to the overlay position
  ctx.translate(x, y);

  // Apply rotation
  ctx.rotate(rotation);

  // Apply flip
  if (flipped) {
    ctx.scale(-1, 1);
  }

  // Apply scale and draw centered
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();
}

/**
 * Draw manipulation handles (selection outline) around the overlay.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawOverlayHandles(ctx) {
  if (!overlayState.active || !overlayState.image) return;

  const img = overlayState.image;
  const { x, y, scale, rotation, flipped } = overlayState;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (flipped) ctx.scale(-1, 1);

  // Dashed selection rectangle
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(-drawW / 2, -drawH / 2, drawW, drawH);
  ctx.setLineDash([]);

  // Corner dots
  const corners = [
    [-drawW / 2, -drawH / 2],
    [drawW / 2, -drawH / 2],
    [-drawW / 2, drawH / 2],
    [drawW / 2, drawH / 2],
  ];
  ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Reset overlay position and scale to defaults.
 */
export function resetOverlayPosition() {
  if (!overlayState.active) return;
  overlayState.x = overlayState.canvasWidth / 2;
  overlayState.y = overlayState.canvasHeight * 0.25;
  const targetWidth = overlayState.canvasWidth * 0.6;
  overlayState.scale = targetWidth / overlayState.image.naturalWidth;
  overlayState.rotation = 0;
  overlayState.flipped = false;
  if (onUpdateCallback) onUpdateCallback();
}

// ==================== TOUCH HANDLERS ====================

function setupTouchHandlers(container) {
  // Convert touch/mouse position to canvas-relative coordinates
  function getCanvasPos(clientX, clientY) {
    const canvas = container.querySelector('canvas');
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Account for CSS scaling (canvas internal vs display size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function getTouchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTouchAngle(t1, t2) {
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
  }

  // --- TOUCH EVENTS ---
  container.addEventListener('touchstart', (e) => {
    if (!overlayState.active) return;

    if (e.touches.length === 1) {
      // Single touch → drag
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      touchState.isDragging = true;
      touchState.startX = pos.x - overlayState.x;
      touchState.startY = pos.y - overlayState.y;
      e.preventDefault();
    } else if (e.touches.length === 2) {
      // Two touches → pinch/rotate
      touchState.isDragging = false;
      touchState.isPinching = true;
      touchState.startDist = getTouchDistance(e.touches[0], e.touches[1]);
      touchState.startAngle = getTouchAngle(e.touches[0], e.touches[1]);
      touchState.startScale = overlayState.scale;
      touchState.startRotation = overlayState.rotation;
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    if (!overlayState.active) return;

    if (touchState.isDragging && e.touches.length === 1) {
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      overlayState.x = pos.x - touchState.startX;
      overlayState.y = pos.y - touchState.startY;
      if (onUpdateCallback) onUpdateCallback();
      e.preventDefault();
    } else if (touchState.isPinching && e.touches.length === 2) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const angle = getTouchAngle(e.touches[0], e.touches[1]);

      // Scale
      const scaleRatio = dist / touchState.startDist;
      overlayState.scale = Math.max(0.2, Math.min(3, touchState.startScale * scaleRatio));

      // Rotation
      overlayState.rotation = touchState.startRotation + (angle - touchState.startAngle);

      if (onUpdateCallback) onUpdateCallback();
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      touchState.isDragging = false;
      touchState.isPinching = false;
    } else if (e.touches.length === 1) {
      // Switched from pinch to drag
      touchState.isPinching = false;
      touchState.isDragging = true;
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      touchState.startX = pos.x - overlayState.x;
      touchState.startY = pos.y - overlayState.y;
    }
  });

  // --- MOUSE EVENTS (desktop testing) ---
  container.addEventListener('mousedown', (e) => {
    if (!overlayState.active) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    touchState.isDragging = true;
    touchState.startX = pos.x - overlayState.x;
    touchState.startY = pos.y - overlayState.y;
  });

  document.addEventListener('mousemove', (e) => {
    if (!touchState.isDragging || !overlayState.active) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    overlayState.x = x - touchState.startX;
    overlayState.y = y - touchState.startY;
    if (onUpdateCallback) onUpdateCallback();
  });

  document.addEventListener('mouseup', () => {
    touchState.isDragging = false;
  });

  // Mouse wheel for scale (desktop testing convenience)
  container.addEventListener('wheel', (e) => {
    if (!overlayState.active) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    overlayState.scale = Math.max(0.2, Math.min(3, overlayState.scale + delta));
    if (onUpdateCallback) onUpdateCallback();
  }, { passive: false });
}

// ==================== CONTROL BUTTONS ====================

function setupControlButtons() {
  // These will be called from main.js when buttons are available
  const btnSizeUp = document.getElementById('btn-size-up');
  const btnSizeDown = document.getElementById('btn-size-down');
  const btnFlip = document.getElementById('btn-flip');
  const btnResetOverlay = document.getElementById('btn-reset-overlay');

  if (btnSizeUp) {
    btnSizeUp.addEventListener('click', () => {
      overlayState.scale = Math.min(3, overlayState.scale + 0.1);
      if (onUpdateCallback) onUpdateCallback();
    });
  }

  if (btnSizeDown) {
    btnSizeDown.addEventListener('click', () => {
      overlayState.scale = Math.max(0.2, overlayState.scale - 0.1);
      if (onUpdateCallback) onUpdateCallback();
    });
  }

  if (btnFlip) {
    btnFlip.addEventListener('click', () => {
      overlayState.flipped = !overlayState.flipped;
      if (onUpdateCallback) onUpdateCallback();
    });
  }

  if (btnResetOverlay) {
    btnResetOverlay.addEventListener('click', () => {
      resetOverlayPosition();
    });
  }
}
