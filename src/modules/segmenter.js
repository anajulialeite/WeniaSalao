/**
 * segmenter.js — MediaPipe hair segmentation module
 * Uses the ImageSegmenter with multiclass model to detect hair pixels.
 * Category 1 = Hair in the multiclass model.
 */

import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

let segmenter = null;
let isInitialized = false;
let isInitializing = false;

/**
 * Initialize the MediaPipe ImageSegmenter.
 * Downloads the model on first call (~5-10 MB).
 */
export async function initSegmenter() {
  if (isInitialized || isInitializing) return;
  isInitializing = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });

    isInitialized = true;
    console.log('✅ MediaPipe segmenter initialized');
  } catch (err) {
    console.error('❌ Failed to initialize segmenter:', err);
    // Try CPU fallback
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });

      isInitialized = true;
      console.log('✅ MediaPipe segmenter initialized (CPU fallback)');
    } catch (fallbackErr) {
      console.error('❌ CPU fallback also failed:', fallbackErr);
      throw fallbackErr;
    }
  } finally {
    isInitializing = false;
  }
}

/**
 * Segment an image and return the hair mask as ImageData.
 * @param {HTMLImageElement|HTMLCanvasElement} imageSource - The image to segment
 * @param {number} width - Output width
 * @param {number} height - Output height
 * @returns {ImageData} - RGBA ImageData where hair pixels are white, rest is transparent
 */
export function segmentHair(imageSource, width, height) {
  if (!isInitialized || !segmenter) {
    throw new Error('Segmenter not initialized. Call initSegmenter() first.');
  }

  const result = segmenter.segment(imageSource);
  const categoryMask = result.categoryMask;

  if (!categoryMask) {
    throw new Error('No category mask returned from segmenter.');
  }

  const maskData = categoryMask.getAsUint8Array();
  const maskWidth = categoryMask.width;
  const maskHeight = categoryMask.height;

  // Create a canvas to draw the mask at the original image size
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskCtx = maskCanvas.getContext('2d');
  const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);

  // Category 1 = Hair → white pixel with full alpha
  for (let i = 0; i < maskData.length; i++) {
    const idx = i * 4;
    if (maskData[i] === 1) {
      maskImageData.data[idx] = 255;     // R
      maskImageData.data[idx + 1] = 255; // G
      maskImageData.data[idx + 2] = 255; // B
      maskImageData.data[idx + 3] = 255; // A
    } else {
      maskImageData.data[idx + 3] = 0;   // Transparent
    }
  }

  maskCtx.putImageData(maskImageData, 0, 0);

  // Scale mask to match original image dimensions
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d');
  
  // Use smoothing for softer mask edges
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(maskCanvas, 0, 0, width, height);

  // Close the segmentation result to free memory
  result.close();

  return outCtx.getImageData(0, 0, width, height);
}

/**
 * Check if segmenter is ready.
 */
export function isSegmenterReady() {
  return isInitialized;
}
