/**
 * camera.js — Photo capture & upload module
 * Handles both camera capture and gallery file selection.
 * Returns a processed Image element ready for the canvas.
 */

const MAX_SIZE = 800; // Reduced from 1024 to save memory

let currentPhotoUrl = null; // Track object URL to prevent memory leaks

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

    // Clean up previous file URL to avoid memory leak
    if (currentPhotoUrl) {
      URL.revokeObjectURL(currentPhotoUrl);
      currentPhotoUrl = null;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    currentPhotoUrl = objectUrl;
    
    img.onload = () => {
      resizeImage(img).then(resized => {
        // If resized returned a NEW image with a NEW objectUrl, we can revoke the original huge camera photo immediately!
        if (resized !== img) {
            URL.revokeObjectURL(objectUrl);
            currentPhotoUrl = resized.src; // Track the new one
        }
        resolve(resized);
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      currentPhotoUrl = null;
      reject(new Error('Não foi possível carregar a imagem.'));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Resize image to fit within MAX_SIZE while maintaining aspect ratio.
 * Returns a new Image from a canvas-resized version.
 * @param {HTMLImageElement} img
 * @returns {Promise<HTMLImageElement>}
 */
function resizeImage(img) {
  return new Promise((resolve) => {
    let { naturalWidth: width, naturalHeight: height } = img;

    if (width <= MAX_SIZE && height <= MAX_SIZE) {
      resolve(img); // No resize needed
      return;
    }

    const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob((blob) => {
      const resizedImg = new Image();
      const objectUrl = URL.createObjectURL(blob);
      resizedImg.onload = () => {
        resolve(resizedImg);
      };
      resizedImg.src = objectUrl;
      resizedImg.width = width;
      resizedImg.height = height;
      
      // Free canvas memory explicitly
      canvas.width = 0;
      canvas.height = 0;
    }, 'image/jpeg', 0.85);
  });
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

  if (currentPhotoUrl) {
    URL.revokeObjectURL(currentPhotoUrl);
    currentPhotoUrl = null;
  }
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
