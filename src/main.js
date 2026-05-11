/**
 * main.js — App entry point
 * Wires together all modules and handles UI interactions.
 */

import './styles/index.css';
import { navigateTo } from './ui/screens.js';
import { setupCaptureHandlers, resetCapture } from './modules/camera.js';
import { initSegmenter, segmentHair, isSegmenterReady } from './modules/segmenter.js';
import { applyHairColor, HAIR_COLORS } from './modules/colorizer.js';
import {
  initHairstyleOverlay,
  setCanvasDimensions,
  loadHairstyle,
  removeHairstyle,
  isHairstyleActive,
  getActiveHairstyleId,
  drawHairstyleOverlay,
  drawOverlayHandles,
  resetOverlayPosition,
  HAIRSTYLE_CATALOG,
} from './modules/hairstyle.js';
import { downloadResult, shareViaWhatsApp, shareNative } from './modules/share.js';
import {
  initToastSystem,
  showToast,
  dismissToast,
  showLoading,
  updateLoading,
  dismissLoading,
  checkCompatibility,
  showIncompatibleOverlay,
} from './modules/errors.js';

// ==================== STATE ====================
const state = {
  currentPhoto: null,       // HTMLImageElement
  originalCanvas: null,     // Canvas with original photo
  hairMask: null,           // ImageData from segmenter
  selectedColor: null,      // { name, color }
  intensity: 50,            // 0-100
  resultCanvas: null,       // Canvas with colored result
  activeCategory: 'all',    // Hairstyle filter category
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize toast system first
  initToastSystem();

  // Check browser compatibility
  const compat = checkCompatibility();
  if (!compat.compatible) {
    showIncompatibleOverlay(compat.issues);
    return; // Don't initialize the rest
  }

  setupNavigation();
  setupCaptureHandlers(onPhotoReady);
  setupColorPalette();
  setupTabs();
  setupIntensitySlider();
  setupResultActions();
  setupHairstyleGallery();
  setupCategoryFilters();
  setupOverlayControls();
  setupShareButton();
  setupRippleEffects();

  // Initialize hairstyle overlay system
  const canvasContainer = document.getElementById('canvas-container');
  initHairstyleOverlay(canvasContainer, onOverlayUpdate);

  // Pre-load segmenter in background after 2 seconds
  setTimeout(() => {
    initSegmenter().catch((err) => {
      console.warn('Background segmenter init failed, will retry on use:', err);
    });
  }, 2000);
});

// ==================== NAVIGATION ====================
function setupNavigation() {
  // Home → Capture
  document.getElementById('btn-start').addEventListener('click', () => {
    navigateTo('capture');
  });

  // Capture ← Back
  document.getElementById('btn-back-capture').addEventListener('click', () => {
    navigateTo('home');
    resetCapture();
  });

  // Capture → Simulator
  document.getElementById('btn-use-photo').addEventListener('click', () => {
    if (state.currentPhoto) {
      navigateTo('simulator');
      prepareSimulator();
    }
  });

  // Simulator ← Back
  document.getElementById('btn-back-simulator').addEventListener('click', () => {
    navigateTo('capture');
  });

  // Simulator → Result
  document.getElementById('btn-see-result').addEventListener('click', () => {
    navigateTo('result');
    prepareResult();
  });

  // Result ← Back
  document.getElementById('btn-back-result').addEventListener('click', () => {
    navigateTo('simulator');
  });

  // Reset button
  document.getElementById('btn-reset').addEventListener('click', () => {
    resetSimulation();
    showToast('Simulação resetada', 'info', 2000);
  });

  // Try again
  document.getElementById('btn-try-again').addEventListener('click', () => {
    navigateTo('capture');
    resetCapture();
    resetSimulation();
  });
}

// ==================== PHOTO HANDLING ====================
function onPhotoReady(img) {
  state.currentPhoto = img;
  showToast('Foto carregada com sucesso!', 'success', 2000);
}

// ==================== SIMULATOR ====================
async function prepareSimulator() {
  const canvas = document.getElementById('main-canvas');
  const loading = document.getElementById('canvas-loading');
  const loadingMsg = document.getElementById('loading-message');
  const loadingBar = document.getElementById('loading-bar-fill');
  const img = state.currentPhoto;

  if (!img) return;

  // Set canvas size to image dimensions
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  // Draw original image
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Free previous original canvas memory
  if (state.originalCanvas) {
    state.originalCanvas.width = 0;
    state.originalCanvas.height = 0;
  }

  // Save original canvas reference
  state.originalCanvas = document.createElement('canvas');
  state.originalCanvas.width = canvas.width;
  state.originalCanvas.height = canvas.height;
  state.originalCanvas.getContext('2d').drawImage(canvas, 0, 0);

  // Set canvas dimensions for hairstyle overlay
  setCanvasDimensions(canvas.width, canvas.height);

  // Show loading with progress
  loading.classList.remove('hidden');
  if (loadingMsg) loadingMsg.textContent = 'Carregando modelo de IA...';
  if (loadingBar) loadingBar.style.width = '10%';

  try {
    if (!isSegmenterReady()) {
      if (loadingMsg) loadingMsg.textContent = 'Baixando modelo de IA...';
      if (loadingBar) loadingBar.style.width = '30%';
      await initSegmenter();
    }

    if (loadingMsg) loadingMsg.textContent = 'Analisando cabelo...';
    if (loadingBar) loadingBar.style.width = '70%';

    state.hairMask = segmentHair(img, canvas.width, canvas.height);

    if (loadingBar) loadingBar.style.width = '100%';
    console.log('✅ Hair segmentation complete');
    showToast('Cabelo detectado com sucesso!', 'success', 2500);
  } catch (err) {
    console.error('Segmentation error:', err);
    showToast('Não foi possível analisar o cabelo. Tente outra foto com melhor iluminação.', 'error', 5000);
  } finally {
    setTimeout(() => {
      loading.classList.add('hidden');
      if (loadingBar) loadingBar.style.width = '0%';
    }, 300);
  }
}

function resetSimulation() {
  state.selectedColor = null;
  state.intensity = 50;

  // Reset color swatch selection
  document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
  document.getElementById('intensity-slider').value = 50;
  const intensityVal = document.getElementById('intensity-value');
  if (intensityVal) intensityVal.textContent = '50%';

  // Remove hairstyle overlay
  removeHairstyle();
  document.querySelectorAll('.style-card').forEach((c) => c.classList.remove('active'));
  document.getElementById('overlay-controls').classList.add('hidden');
  document.getElementById('overlay-hint').classList.add('hidden');

  // Redraw original
  if (state.originalCanvas) {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.originalCanvas, 0, 0);
    
    // Free result canvas memory
    if (state.resultCanvas) {
      state.resultCanvas.width = 0;
      state.resultCanvas.height = 0;
    }
    state.resultCanvas = null;
  }
}

// ==================== RENDERING ====================

/**
 * Composite render: original photo + color + hairstyle overlay
 */
function renderCanvas() {
  const mainCanvas = document.getElementById('main-canvas');
  if (!mainCanvas || !state.originalCanvas) return;

  const ctx = mainCanvas.getContext('2d');
  const w = mainCanvas.width;
  const h = mainCanvas.height;

  let newResultCanvas = null;

  // Layer 1: Start with original or color-modified image
  if (state.selectedColor && state.hairMask) {
    newResultCanvas = applyHairColor(
      state.originalCanvas,
      state.hairMask,
      state.selectedColor.color,
      state.intensity
    );
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(newResultCanvas, 0, 0);
  } else {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(state.originalCanvas, 0, 0);
  }

  // Layer 2: Hairstyle overlay
  if (isHairstyleActive()) {
    const displayRect = mainCanvas.getBoundingClientRect();
    drawHairstyleOverlay(ctx, displayRect.width, displayRect.height);
    drawOverlayHandles(ctx);

    // Save result including overlay
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = w;
    compositeCanvas.height = h;
    const compCtx = compositeCanvas.getContext('2d');
    compCtx.drawImage(mainCanvas, 0, 0);
    
    // Free the intermediate colored canvas since composite is the new final
    if (newResultCanvas) {
      newResultCanvas.width = 0;
      newResultCanvas.height = 0;
    }
    newResultCanvas = compositeCanvas;
  }

  // Free previous result canvas to prevent memory leak
  if (state.resultCanvas && state.resultCanvas !== newResultCanvas) {
    state.resultCanvas.width = 0;
    state.resultCanvas.height = 0;
  }
  state.resultCanvas = newResultCanvas;
}

/**
 * Called when the hairstyle overlay position/scale changes.
 */
function onOverlayUpdate() {
  renderCanvas();
}

// ==================== COLOR PALETTE ====================
function setupColorPalette() {
  const palette = document.getElementById('color-palette');

  HAIR_COLORS.forEach((c) => {
    const swatch = document.createElement('button');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = c.color;
    swatch.setAttribute('aria-label', c.name);
    swatch.title = c.name;

    swatch.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');

      state.selectedColor = c;
      renderCanvas();
    });

    palette.appendChild(swatch);
  });
}

function setupIntensitySlider() {
  const slider = document.getElementById('intensity-slider');
  const valueDisplay = document.getElementById('intensity-value');

  slider.addEventListener('input', (e) => {
    state.intensity = parseInt(e.target.value, 10);
    if (valueDisplay) valueDisplay.textContent = `${state.intensity}%`;
    if (state.selectedColor) {
      renderCanvas();
    }
  });
}

// ==================== TABS ====================
function setupTabs() {
  const tabs = document.querySelectorAll('.sim-tab');
  const panels = document.querySelectorAll('.sim-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`panel-${target}`).classList.add('active');
    });
  });
}

// ==================== HAIRSTYLE GALLERY ====================
function setupHairstyleGallery() {
  const gallery = document.getElementById('style-gallery');

  HAIRSTYLE_CATALOG.forEach((style) => {
    const card = document.createElement('div');
    card.className = 'style-card';
    card.dataset.id = style.id;
    card.dataset.category = style.category;

    const thumb = document.createElement('div');
    thumb.className = 'style-card-thumb';

    const img = document.createElement('img');
    img.src = `./hairstyles/${style.id}.png`;
    img.alt = style.name;
    img.loading = 'lazy';
    thumb.appendChild(img);

    const name = document.createElement('span');
    name.className = 'style-card-name';
    name.textContent = style.name;

    card.appendChild(thumb);
    card.appendChild(name);

    card.addEventListener('click', () => {
      selectHairstyle(style.id, card);
    });

    gallery.appendChild(card);
  });
}

function setupCategoryFilters() {
  const buttons = document.querySelectorAll('.style-cat-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      state.activeCategory = btn.dataset.category;
      filterGallery(state.activeCategory);
    });
  });
}

function filterGallery(category) {
  const cards = document.querySelectorAll('.style-card');
  cards.forEach((card) => {
    if (category === 'all' || card.dataset.category === category) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

async function selectHairstyle(hairstyleId, cardElement) {
  // Update card active state
  document.querySelectorAll('.style-card').forEach((c) => c.classList.remove('active'));
  cardElement.classList.add('active');

  // Show overlay controls and hint
  document.getElementById('overlay-controls').classList.remove('hidden');
  document.getElementById('overlay-hint').classList.remove('hidden');

  // Load the hairstyle overlay
  try {
    await loadHairstyle(hairstyleId, `./hairstyles/${hairstyleId}.png`);
  } catch (err) {
    console.error('Failed to load hairstyle:', err);
    showToast('Não foi possível carregar o estilo. Tente outro.', 'error');
  }
}

// ==================== OVERLAY CONTROLS ====================
function setupOverlayControls() {
  const btnRemove = document.getElementById('btn-remove-style');
  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      removeHairstyle();
      document.querySelectorAll('.style-card').forEach((c) => c.classList.remove('active'));
      document.getElementById('overlay-controls').classList.add('hidden');
      document.getElementById('overlay-hint').classList.add('hidden');
      renderCanvas();
    });
  }
}

// ==================== SHARE BUTTON ====================
function setupShareButton() {
  const btnShare = document.getElementById('btn-share');
  if (btnShare) {
    // Only show if Web Share API is available
    if (navigator.canShare) {
      btnShare.classList.remove('hidden');
    }
    btnShare.addEventListener('click', () => {
      const canvas = state.resultCanvas || state.originalCanvas;
      shareNative(canvas);
    });
  }
}

// ==================== RESULT SCREEN ====================
function prepareResult() {
  const beforeCanvas = document.getElementById('result-canvas-before');
  const afterCanvas = document.getElementById('result-canvas-after');

  if (!state.originalCanvas) return;

  const w = state.originalCanvas.width;
  const h = state.originalCanvas.height;

  // Before canvas
  beforeCanvas.width = w;
  beforeCanvas.height = h;
  beforeCanvas.getContext('2d').drawImage(state.originalCanvas, 0, 0);

  // After canvas — use the composite result
  afterCanvas.width = w;
  afterCanvas.height = h;
  const afterCtx = afterCanvas.getContext('2d');
  if (state.resultCanvas) {
    afterCtx.drawImage(state.resultCanvas, 0, 0);
  } else {
    afterCtx.drawImage(state.originalCanvas, 0, 0);
  }

  // Setup comparison slider
  setupComparisonSlider();
}

function setupComparisonSlider() {
  const handle = document.getElementById('result-slider-handle');
  const comparison = document.getElementById('result-comparison');
  const afterCanvas = document.getElementById('result-canvas-after');

  if (!handle || !comparison) return;

  let isDragging = false;

  const updateSlider = (clientX) => {
    const rect = comparison.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;

    handle.style.left = `${percent}%`;
    afterCanvas.style.clipPath = `inset(0 0 0 ${percent}%)`;
  };

  // Initialize at 50%
  afterCanvas.style.clipPath = 'inset(0 0 0 50%)';

  // Touch events
  handle.addEventListener('touchstart', (e) => {
    isDragging = true;
    e.preventDefault();
  });
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    updateSlider(e.touches[0].clientX);
  });
  document.addEventListener('touchend', () => { isDragging = false; });

  // Mouse events (for desktop testing)
  handle.addEventListener('mousedown', () => { isDragging = true; });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateSlider(e.clientX);
  });
  document.addEventListener('mouseup', () => { isDragging = false; });
}

function setupResultActions() {
  // Download
  document.getElementById('btn-download').addEventListener('click', () => {
    const canvas = state.resultCanvas || state.originalCanvas;
    downloadResult(canvas);
    showToast('Imagem salva!', 'success', 2000);
  });
}

// ==================== RIPPLE EFFECTS ====================
function setupRippleEffects() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-ripple');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}
