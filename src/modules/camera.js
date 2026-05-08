/**
 * camera.js — Photo capture & upload module
 * Handles both camera capture and gallery file selection.
 * Returns a processed Image element ready for the canvas.
 */

const MAX_SIZE = 1024; // Max dimension in pixels

/**
 * Process an image file: load, resize, return as Image element.
 * @param {File} file - Image file from input
 * @returns {Promise<HTMLImageElement>}
 */
export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Arquivo inválido. Selecione uma imagem.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize if needed
        const resized = resizeImage(img);
        resolve(resized);
      };
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize image to fit within MAX_SIZE while maintaining aspect ratio.
 * Returns a new Image from a canvas-resized version.
 * @param {HTMLImageElement} img
 * @returns {HTMLImageElement}
 */
function resizeImage(img) {
  let { width, height } = img;

  if (width <= MAX_SIZE && height <= MAX_SIZE) {
    return img; // No resize needed
  }

  const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const resizedImg = new Image();
  resizedImg.src = canvas.toDataURL('image/jpeg', 0.9);
  resizedImg.width = width;
  resizedImg.height = height;

  return resizedImg;
}

/**
 * Display image preview in the capture screen.
 * @param {HTMLImageElement} img
 */
export function showPreview(img) {
  const preview = document.getElementById('capture-img-preview');
  const placeholder = document.getElementById('capture-placeholder');
  const btnUse = document.getElementById('btn-use-photo');

  preview.src = img.src;
  preview.classList.remove('hidden');
  placeholder.classList.add('hidden');
  btnUse.classList.remove('hidden');
}

/**
 * Reset the capture screen to initial state.
 */
export function resetCapture() {
  const preview = document.getElementById('capture-img-preview');
  const placeholder = document.getElementById('capture-placeholder');
  const btnUse = document.getElementById('btn-use-photo');

  preview.src = '';
  preview.classList.add('hidden');
  placeholder.classList.remove('hidden');
  btnUse.classList.add('hidden');
}

/**
 * Set up camera and gallery input handlers.
 * @param {Function} onPhotoReady - Callback when a photo is processed
 */
export function setupCaptureHandlers(onPhotoReady) {
  const btnCamera = document.getElementById('btn-camera');
  const btnGallery = document.getElementById('btn-gallery');
  const fileInput = document.getElementById('file-input');
  const cameraInput = document.getElementById('camera-input');

  btnCamera.addEventListener('click', () => {
    cameraInput.click();
  });

  btnGallery.addEventListener('click', () => {
    fileInput.click();
  });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = await processImageFile(file);
      // Wait for resized image to fully load if it was resized
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
        });
      }
      showPreview(img);
      onPhotoReady(img);
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      alert(err.message);
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  fileInput.addEventListener('change', handleFile);
  cameraInput.addEventListener('change', handleFile);
}
