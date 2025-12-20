/**
 * BGRMV - Background Remover Plugin v1.0.2
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

log('Script loaded - v1.0.2');
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
    log('Available exports:', Object.keys(transformers));
} catch (importError) {
    logError('Failed to import transformers.js:', importError);
    throw importError;
}

// Configuration
const MODEL_ID = 'Xenova/modnet';
const CACHE_KEY = 'bgrmv_model_loaded_v2';

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

    // Configure transformers.js
    log('Configuring transformers.js environment...');
    try {
        env.backends.onnx.wasm.proxy = false;
        env.allowLocalModels = false;
        log('Environment configured:', {
            wasmProxy: env.backends.onnx.wasm.proxy,
            allowLocalModels: env.allowLocalModels
        });
    } catch (envError) {
        logError('Failed to configure environment:', envError);
    }

    // Setup event listeners
    log('Setting up event listeners...');
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

    // Check for WebGPU support
    log('Checking WebGPU support...');
    let hasWebGPU = false;
    try {
        hasWebGPU = 'gpu' in navigator;
        if (hasWebGPU) {
            const adapter = await navigator.gpu?.requestAdapter();
            hasWebGPU = !!adapter;
            log('WebGPU adapter:', adapter ? 'found' : 'not found');
        }
    } catch (gpuError) {
        log('WebGPU check error:', gpuError);
        hasWebGPU = false;
    }

    const device = hasWebGPU ? 'webgpu' : 'wasm';
    log('Selected device:', device);

    // Update UI
    elements.loaderLabel.textContent = 'Loading AI Model...';
    elements.loaderPercent.textContent = '0%';

    // Try loading with selected device
    try {
        log(`Loading model with ${device}...`);
        log('Calling AutoModel.from_pretrained...');

        model = await AutoModel.from_pretrained(MODEL_ID, {
            device: device,
            progress_callback: handleModelProgress,
        });

        log('Model loaded successfully!', model);

        elements.loaderLabel.textContent = 'Loading processor...';
        elements.loaderPercent.textContent = '90%';
        elements.progressFill.style.width = '90%';

        log('Loading processor...');
        processor = await AutoProcessor.from_pretrained(MODEL_ID);
        log('Processor loaded successfully!', processor);

        localStorage.setItem(CACHE_KEY, 'true');
        elements.firstTimeNotice.style.display = 'none';
        elements.modelStatus.style.display = 'none';

        log('Model and processor ready!');

    } catch (error) {
        logError(`Failed to load with ${device}:`, error);
        logError('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        // Try WASM fallback if we were using WebGPU
        if (device === 'webgpu') {
            log('Trying WASM fallback...');
            try {
                model = await AutoModel.from_pretrained(MODEL_ID, {
                    device: 'wasm',
                    progress_callback: handleModelProgress,
                });

                processor = await AutoProcessor.from_pretrained(MODEL_ID);

                log('WASM fallback successful!');
                localStorage.setItem(CACHE_KEY, 'true');
                elements.firstTimeNotice.style.display = 'none';
                elements.modelStatus.style.display = 'none';

            } catch (fallbackError) {
                logError('WASM fallback also failed:', fallbackError);
                showError('Failed to load AI model. Error: ' + fallbackError.message);
                elements.modelStatus.style.display = 'none';
            }
        } else {
            showError('Failed to load AI model. Error: ' + error.message);
            elements.modelStatus.style.display = 'none';
        }
    } finally {
        isModelLoading = false;
        log('preloadModel() finished', { model: !!model, processor: !!processor });
    }
}

function handleModelProgress(progress) {
    if (!progress) return;

    log('Model progress:', progress);

    if (progress.status === 'progress' && progress.progress !== undefined) {
        const percent = Math.round(progress.progress);
        const fileName = progress.file || 'model';
        elements.loaderLabel.textContent = `Loading ${fileName}...`;
        elements.loaderPercent.textContent = `${percent}%`;
        elements.progressFill.style.width = `${Math.min(percent, 85)}%`;
    } else if (progress.status === 'done') {
        elements.loaderPercent.textContent = '85%';
        elements.progressFill.style.width = '85%';
    } else if (progress.status === 'ready') {
        elements.progressFill.style.width = '100%';
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
            throw new Error('Model failed to load');
        }

        log('Reading file as data URL...');
        const imageUrl = await readFileAsDataURL(file);
        elements.originalImage.src = imageUrl;

        elements.processingText.textContent = 'Analyzing image...';
        elements.processingProgress.style.width = '30%';

        log('Loading image with RawImage...');
        const image = await RawImage.fromURL(imageUrl);
        log('Image loaded:', { width: image.width, height: image.height, channels: image.channels });

        elements.processingText.textContent = 'Removing background...';
        elements.processingProgress.style.width = '50%';

        log('Processing through model...');
        const { pixel_values } = await processor(image);
        log('Pixel values generated:', pixel_values?.dims);

        elements.processingProgress.style.width = '70%';

        log('Running inference...');
        const output = await model({ input: pixel_values });
        log('Inference complete, output keys:', Object.keys(output));

        elements.processingText.textContent = 'Generating result...';
        elements.processingProgress.style.width = '90%';

        log('Applying mask...');
        const resultUrl = await applyMask(image, output.output);

        elements.processingProgress.style.width = '100%';

        elements.resultImage.src = resultUrl;
        elements.processing.style.display = 'none';
        elements.results.style.display = 'block';

        log('Processing complete!');

    } catch (error) {
        logError('Processing error:', error);
        logError('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
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

async function applyMask(originalImage, maskOutput) {
    log('applyMask() called', {
        imageSize: `${originalImage.width}x${originalImage.height}`,
        maskDims: maskOutput?.dims
    });

    const maskData = maskOutput.data;
    const maskWidth = maskOutput.dims[3];
    const maskHeight = maskOutput.dims[2];

    log('Mask dimensions:', { maskWidth, maskHeight, dataLength: maskData.length });

    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskWidth;
    maskCanvas.height = maskHeight;
    const maskCtx = maskCanvas.getContext('2d');
    const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);

    for (let i = 0; i < maskData.length; i++) {
        const alpha = Math.round(maskData[i] * 255);
        maskImageData.data[i * 4] = alpha;
        maskImageData.data[i * 4 + 1] = alpha;
        maskImageData.data[i * 4 + 2] = alpha;
        maskImageData.data[i * 4 + 3] = 255;
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = originalImage.width;
    originalCanvas.height = originalImage.height;
    const originalCtx = originalCanvas.getContext('2d');

    const imgData = originalCtx.createImageData(originalImage.width, originalImage.height);
    for (let i = 0; i < originalImage.data.length; i++) {
        imgData.data[i] = originalImage.data[i];
    }
    originalCtx.putImageData(imgData, 0, 0);

    ctx.drawImage(maskCanvas, 0, 0, originalImage.width, originalImage.height);

    const scaledMaskData = ctx.getImageData(0, 0, originalImage.width, originalImage.height);
    const resultData = originalCtx.getImageData(0, 0, originalImage.width, originalImage.height);

    for (let i = 0; i < resultData.data.length / 4; i++) {
        resultData.data[i * 4 + 3] = scaledMaskData.data[i * 4];
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(resultData, 0, 0);

    log('Mask applied successfully');
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
