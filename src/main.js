/**
 * main.js — App entry point
 * Wires together all modules and handles UI interactions.
 */

import './styles/index.css';
import { navigateTo } from './ui/screens.js';
import { setupCaptureHandlers, resetCapture } from './modules/camera.js';
import { initSegmenter, segmentHair, isSegmenterReady } from './modules/segmenter.js';
import { applyHairColor, HAIR_COLORS } from './modules/colorizer.js';

// ==================== STATE ====================
const state = {
  currentPhoto: null,       // HTMLImageElement
  originalCanvas: null,     // Canvas with original photo
  hairMask: null,           // ImageData from segmenter
  selectedColor: null,      // { name, color }
  intensity: 50,            // 0-100
  resultCanvas: null,       // Canvas with colored result
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupCaptureHandlers(onPhotoReady);
  setupColorPalette();
  setupTabs();
  setupIntensitySlider();
  setupResultActions();

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
}

// ==================== SIMULATOR ====================
async function prepareSimulator() {
  const canvas = document.getElementById('main-canvas');
  const container = document.getElementById('canvas-container');
  const loading = document.getElementById('canvas-loading');
  const img = state.currentPhoto;

  if (!img) return;

  // Set canvas size to image dimensions
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  // Draw original image
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Save original canvas reference
  state.originalCanvas = document.createElement('canvas');
  state.originalCanvas.width = canvas.width;
  state.originalCanvas.height = canvas.height;
  state.originalCanvas.getContext('2d').drawImage(canvas, 0, 0);

  // Show loading & run segmentation
  loading.classList.remove('hidden');

  try {
    if (!isSegmenterReady()) {
      await initSegmenter();
    }
    state.hairMask = segmentHair(img, canvas.width, canvas.height);
    console.log('✅ Hair segmentation complete');
  } catch (err) {
    console.error('Segmentation error:', err);
    alert('Não foi possível analisar o cabelo. Tente outra foto com melhor iluminação.');
  } finally {
    loading.classList.add('hidden');
  }
}

function resetSimulation() {
  state.selectedColor = null;
  state.intensity = 50;

  // Reset color swatch selection
  document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
  document.getElementById('intensity-slider').value = 50;

  // Redraw original
  if (state.originalCanvas) {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.originalCanvas, 0, 0);
    state.resultCanvas = null;
  }
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
      applyCurrentColor();
    });

    palette.appendChild(swatch);
  });
}

function setupIntensitySlider() {
  const slider = document.getElementById('intensity-slider');
  slider.addEventListener('input', (e) => {
    state.intensity = parseInt(e.target.value, 10);
    if (state.selectedColor) {
      applyCurrentColor();
    }
  });
}

function applyCurrentColor() {
  if (!state.originalCanvas || !state.hairMask || !state.selectedColor) return;

  const resultCanvas = applyHairColor(
    state.originalCanvas,
    state.hairMask,
    state.selectedColor.color,
    state.intensity
  );

  // Draw result to main canvas
  const mainCanvas = document.getElementById('main-canvas');
  const ctx = mainCanvas.getContext('2d');
  ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  ctx.drawImage(resultCanvas, 0, 0);

  state.resultCanvas = resultCanvas;
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

  // After canvas
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
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'salao-wenia-simulacao.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  });
}
