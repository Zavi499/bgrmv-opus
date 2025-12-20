/**
 * BGRMV - Background Remover Plugin v1.0.3
 * Uses Xenova/modnet for client-side background removal
 * ES Module version using @huggingface/transformers v3
 */

// Debug helper
const DEBUG = true;
function log(...args) {
    if (DEBUG) console.log('[BGRMV]', ...args);
}
function logError(...args) {
    console.error('[BGRMV ERROR]', ...args);
}

log('Script loaded - v1.0.4');
log('Starting import of transformers.js...');

// Import transformers.js
let env, AutoModel, AutoProcessor, RawImage;

try {
    log('Attempting dynamic import from CDN...');
    const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2');
    env = transformers.env;
    AutoModel = transformers.AutoModel;
    AutoProcessor = transformers.AutoProcessor;
    RawImage = transformers.RawImage;
    log('Transformers.js imported successfully!');
} catch (importError) {
    logError('Failed to import transformers.js:', importError);
    throw importError;
}

// Configuration
const MODEL_ID = 'Xenova/modnet';
const CACHE_KEY = 'bgrmv_model_loaded_v3';

log('Configuration:', { MODEL_ID, CACHE_KEY });

// State
let model = null;
let processor = null;
let isModelLoading = false;
let isProcessing = false;

// DOM Elements
let elements = {};

// Initialize when DOM is ready
log('Checking DOM state:', document.readyState);
if (document.readyState === 'loading') {
    log('DOM still loading, adding event listener...');
    document.addEventListener('DOMContentLoaded', init);
} else {
    log('DOM ready, initializing now...');
    init();
}

function init() {
    log('init() called');

    // Cache DOM elements
    elements = {
        container: document.getElementById('bgrmv-container'),
        firstTimeNotice: document.getElementById('bgrmv-first-time-notice'),
        modelStatus: document.getElementById('bgrmv-model-status'),
        loaderLabel: document.getElementById('bgrmv-loader-label'),
        loaderPercent: document.getElementById('bgrmv-loader-percent'),
        progressFill: document.getElementById('bgrmv-progress-fill'),
        modelHint: document.getElementById('bgrmv-model-hint'),
        uploadArea: document.getElementById('bgrmv-upload-area'),
        fileInput: document.getElementById('bgrmv-file-input'),
        processing: document.getElementById('bgrmv-processing'),
        processingText: document.getElementById('bgrmv-processing-text'),
        processingProgress: document.getElementById('bgrmv-processing-progress'),
        results: document.getElementById('bgrmv-results'),
        originalImage: document.getElementById('bgrmv-original-image'),
        resultImage: document.getElementById('bgrmv-result-image'),
        downloadBtn: document.getElementById('bgrmv-download-btn'),
        newImageBtn: document.getElementById('bgrmv-new-image-btn'),
        error: document.getElementById('bgrmv-error'),
        errorMessage: document.getElementById('bgrmv-error-message')
    };

    log('DOM elements found:', {
        container: !!elements.container,
        uploadArea: !!elements.uploadArea,
        fileInput: !!elements.fileInput
    });

    if (!elements.container) {
        logError('Container not found! Make sure [bgrmv] shortcode is on the page.');
        return;
    }

    // Configure transformers.js - IMPORTANT: disable WASM proxy for browser
    log('Configuring transformers.js environment...');
    try {
        env.backends.onnx.wasm.proxy = false;
        env.allowLocalModels = false;
        log('Environment configured');
    } catch (envError) {
        logError('Failed to configure environment:', envError);
    }

    // Setup event listeners
    setupEventListeners();

    // Check if first time
    checkFirstTimeVisitor();

    // Preload model in background
    log('Starting model preload...');
    preloadModel();
}

function setupEventListeners() {
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
            elements.fileInput.click();
        }
    });
    elements.downloadBtn.addEventListener('click', handleDownload);
    elements.newImageBtn.addEventListener('click', resetToUpload);
    log('Event listeners attached');
}

function checkFirstTimeVisitor() {
    const hasVisited = localStorage.getItem(CACHE_KEY);
    log('First time visitor check:', { hasVisited });
    if (!hasVisited) {
        elements.firstTimeNotice.style.display = 'flex';
    }
}

async function preloadModel() {
    log('preloadModel() called', { model: !!model, isModelLoading });

    if (model || isModelLoading) {
        log('Model already loaded or loading, skipping...');
        return;
    }

    isModelLoading = true;
    elements.modelStatus.style.display = 'block';

    // Use WASM by default - it's more reliable than WebGPU for this model
    // WebGPU can hang on some systems
    const device = 'wasm';
    log('Using device:', device, '(WASM is more reliable for ModNet)');

    // Update UI
    elements.loaderLabel.textContent = 'Downloading AI Model...';
    elements.loaderPercent.textContent = '0%';
    elements.progressFill.style.width = '0%';

    try {
        log('Loading model...');

        model = await AutoModel.from_pretrained(MODEL_ID, {
            device: device,
            progress_callback: (progress) => {
                if (!progress) return;

                // Detailed progress logging
                if (progress.status === 'progress') {
                    const percent = Math.round(progress.progress || 0);
                    const file = progress.file || 'model files';
                    const loaded = progress.loaded ? `${(progress.loaded / 1024 / 1024).toFixed(1)}MB` : '';
                    const total = progress.total ? `${(progress.total / 1024 / 1024).toFixed(1)}MB` : '';

                    log(`Download: ${file} - ${percent}% ${loaded}/${total}`);

                    elements.loaderLabel.textContent = `Downloading ${file}...`;
                    elements.loaderPercent.textContent = `${percent}%`;
                    elements.progressFill.style.width = `${Math.min(percent * 0.8, 80)}%`; // Cap at 80% for model
                } else if (progress.status === 'done') {
                    log('Download complete for:', progress.file);
                } else if (progress.status === 'initiate') {
                    log('Starting download:', progress.file);
                } else {
                    log('Progress status:', progress.status, progress);
                }
            },
        });

        log('Model loaded successfully!');
        elements.loaderLabel.textContent = 'Loading image processor...';
        elements.loaderPercent.textContent = '85%';
        elements.progressFill.style.width = '85%';

        log('Loading processor...');
        processor = await AutoProcessor.from_pretrained(MODEL_ID);
        log('Processor loaded successfully!');

        elements.loaderLabel.textContent = 'Ready!';
        elements.loaderPercent.textContent = '100%';
        elements.progressFill.style.width = '100%';

        // Brief delay to show 100%
        await new Promise(resolve => setTimeout(resolve, 500));

        localStorage.setItem(CACHE_KEY, 'true');
        elements.firstTimeNotice.style.display = 'none';
        elements.modelStatus.style.display = 'none';

        log('Model and processor ready!');

    } catch (error) {
        logError('Failed to load model:', error);
        logError('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        showError('Failed to load AI model: ' + error.message);
        elements.modelStatus.style.display = 'none';
    } finally {
        isModelLoading = false;
        log('preloadModel() finished', { model: !!model, processor: !!processor });
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.add('bgrmv-dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.remove('bgrmv-dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.remove('bgrmv-dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

async function processFile(file) {
    log('processFile() called', { name: file.name, type: file.type, size: file.size });

    if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file (JPG, PNG, or WebP)');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showError('Image size must be less than 10MB');
        return;
    }

    if (isProcessing) {
        showError('Please wait for the current image to finish processing');
        return;
    }

    isProcessing = true;
    hideError();

    elements.uploadArea.style.display = 'none';
    elements.results.style.display = 'none';
    elements.processing.style.display = 'block';
    elements.processingText.textContent = 'Preparing image...';
    elements.processingProgress.style.width = '10%';

    try {
        // Load model if not ready
        if (!model || !processor) {
            log('Model not ready, loading now...');
            elements.processingText.textContent = 'Loading AI model...';
            elements.modelStatus.style.display = 'block';
            await preloadModel();
            elements.modelStatus.style.display = 'none';
        }

        if (!model || !processor) {
            throw new Error('Model failed to load. Please refresh the page and try again.');
        }

        log('Reading file as data URL...');
        const imageUrl = await readFileAsDataURL(file);
        elements.originalImage.src = imageUrl;

        elements.processingText.textContent = 'Loading image...';
        elements.processingProgress.style.width = '20%';

        log('Loading image with RawImage...');
        const image = await RawImage.fromURL(imageUrl);
        log('Image loaded:', { width: image.width, height: image.height, channels: image.channels });

        elements.processingText.textContent = 'Processing image...';
        elements.processingProgress.style.width = '40%';

        log('Running processor...');
        const { pixel_values } = await processor(image);
        log('Pixel values shape:', pixel_values.dims);

        elements.processingText.textContent = 'Removing background...';
        elements.processingProgress.style.width = '60%';

        log('Running model inference...');
        const output = await model({ input: pixel_values });
        log('Inference complete, output keys:', Object.keys(output));

        elements.processingText.textContent = 'Generating result...';
        elements.processingProgress.style.width = '80%';

        log('Applying mask...');
        const resultUrl = await applyMask(imageUrl, output.output);
        log('Mask applied successfully');

        elements.processingProgress.style.width = '100%';

        elements.resultImage.src = resultUrl;
        elements.processing.style.display = 'none';
        elements.results.style.display = 'block';

        log('Processing complete!');

    } catch (error) {
        logError('Processing error:', error);
        showError('Failed to process image: ' + error.message);
        resetToUpload();
    } finally {
        isProcessing = false;
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

async function applyMask(imageUrl, maskOutput) {
    log('applyMask() called');
    log('Mask output dims:', maskOutput.dims);

    const maskData = maskOutput.data;
    const maskHeight = maskOutput.dims[2];
    const maskWidth = maskOutput.dims[3];

    log('Mask size:', { maskWidth, maskHeight, dataLength: maskData.length });

    // Load the original image as HTML Image element
    const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
    });

    log('Original image loaded:', { width: img.width, height: img.height });

    // Create result canvas at original image size
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Draw original image to canvas
    ctx.drawImage(img, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    // Create mask canvas at mask size
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskWidth;
    maskCanvas.height = maskHeight;
    const maskCtx = maskCanvas.getContext('2d');
    const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);

    // Convert mask tensor to grayscale image
    for (let i = 0; i < maskData.length; i++) {
        const value = Math.round(maskData[i] * 255);
        maskImageData.data[i * 4] = value;     // R
        maskImageData.data[i * 4 + 1] = value; // G
        maskImageData.data[i * 4 + 2] = value; // B
        maskImageData.data[i * 4 + 3] = 255;   // A
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    // Create a temporary canvas to scale the mask
    const scaledMaskCanvas = document.createElement('canvas');
    scaledMaskCanvas.width = img.width;
    scaledMaskCanvas.height = img.height;
    const scaledMaskCtx = scaledMaskCanvas.getContext('2d');

    // Scale mask to original image size
    scaledMaskCtx.drawImage(maskCanvas, 0, 0, img.width, img.height);
    const scaledMaskData = scaledMaskCtx.getImageData(0, 0, img.width, img.height);

    // Apply mask as alpha channel to original image
    for (let i = 0; i < imageData.data.length / 4; i++) {
        // Use the R channel of the scaled mask as alpha
        imageData.data[i * 4 + 3] = scaledMaskData.data[i * 4];
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
}

function handleDownload() {
    const resultSrc = elements.resultImage.src;
    if (!resultSrc) return;

    const link = document.createElement('a');
    link.download = 'background-removed-' + Date.now() + '.png';
    link.href = resultSrc;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    log('Image downloaded');
}

function resetToUpload() {
    elements.processing.style.display = 'none';
    elements.results.style.display = 'none';
    elements.uploadArea.style.display = 'block';
    elements.fileInput.value = '';
    elements.originalImage.src = '';
    elements.resultImage.src = '';
    elements.processingProgress.style.width = '0%';
    hideError();
    log('Reset to upload state');
}

function showError(message) {
    logError('Showing error to user:', message);
    elements.error.style.display = 'flex';
    elements.errorMessage.textContent = message;
}

function hideError() {
    elements.error.style.display = 'none';
}
