/**
 * BGRMV - Background Remover Plugin
 * Uses Xenova/modnet for client-side background removal
 * ES Module version using @huggingface/transformers v3
 */

import {
    env,
    AutoModel,
    AutoProcessor,
    RawImage,
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2';

// Configuration
const MODEL_ID = 'Xenova/modnet';
const CACHE_KEY = 'bgrmv_model_loaded';

// State
let model = null;
let processor = null;
let isModelLoading = false;
let isProcessing = false;

// DOM Elements
let elements = {};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
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

    if (!elements.container) {
        console.warn('BGRMV: Container not found');
        return;
    }

    // Configure transformers.js
    env.backends.onnx.wasm.proxy = false;
    env.allowLocalModels = false;

    // Setup event listeners
    setupEventListeners();

    // Check if first time
    checkFirstTimeVisitor();

    // Preload model in background
    preloadModel();
}

function setupEventListeners() {
    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);

    // Click to upload
    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
            elements.fileInput.click();
        }
    });

    // Download button
    elements.downloadBtn.addEventListener('click', handleDownload);

    // New image button
    elements.newImageBtn.addEventListener('click', resetToUpload);
}

function checkFirstTimeVisitor() {
    const hasVisited = localStorage.getItem(CACHE_KEY);
    if (!hasVisited) {
        elements.firstTimeNotice.style.display = 'flex';
    }
}

async function preloadModel() {
    if (model || isModelLoading) return;

    isModelLoading = true;
    elements.modelStatus.style.display = 'block';

    try {
        console.log('BGRMV: Starting model preload...');

        // Check for WebGPU support
        const hasWebGPU = 'gpu' in navigator;
        const device = hasWebGPU ? 'webgpu' : 'wasm';

        console.log(`BGRMV: Using device: ${device}`);

        // Update UI
        elements.loaderLabel.textContent = 'Loading AI Model...';
        elements.loaderPercent.textContent = '0%';

        // Load model with progress callback
        model = await AutoModel.from_pretrained(MODEL_ID, {
            device: device,
            progress_callback: handleModelProgress,
        });

        elements.loaderLabel.textContent = 'Loading processor...';
        elements.loaderPercent.textContent = '90%';
        elements.progressFill.style.width = '90%';

        // Load processor
        processor = await AutoProcessor.from_pretrained(MODEL_ID);

        console.log('BGRMV: Model loaded successfully');

        // Mark as loaded
        localStorage.setItem(CACHE_KEY, 'true');

        // Hide notices
        elements.firstTimeNotice.style.display = 'none';
        elements.modelStatus.style.display = 'none';

    } catch (error) {
        console.error('BGRMV: Error loading model with WebGPU, trying WASM fallback:', error);

        // Try fallback with WASM
        try {
            model = await AutoModel.from_pretrained(MODEL_ID, {
                device: 'wasm',
                progress_callback: handleModelProgress,
            });

            processor = await AutoProcessor.from_pretrained(MODEL_ID);

            console.log('BGRMV: Model loaded with WASM fallback');
            localStorage.setItem(CACHE_KEY, 'true');
            elements.firstTimeNotice.style.display = 'none';
            elements.modelStatus.style.display = 'none';

        } catch (fallbackError) {
            console.error('BGRMV: Fallback also failed:', fallbackError);
            showError('Failed to load AI model. Please check your browser compatibility and try again.');
            elements.modelStatus.style.display = 'none';
        }
    } finally {
        isModelLoading = false;
    }
}

function handleModelProgress(progress) {
    if (!progress) return;

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
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file (JPG, PNG, or WebP)');
        return;
    }

    // Validate file size (max 10MB)
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

    // Show processing state
    elements.uploadArea.style.display = 'none';
    elements.results.style.display = 'none';
    elements.processing.style.display = 'block';
    elements.processingText.textContent = 'Preparing image...';
    elements.processingProgress.style.width = '10%';

    try {
        // Load model if not ready
        if (!model || !processor) {
            elements.processingText.textContent = 'Loading AI model...';
            elements.modelStatus.style.display = 'block';
            await preloadModel();
            elements.modelStatus.style.display = 'none';
        }

        if (!model || !processor) {
            throw new Error('Model failed to load');
        }

        // Read file as data URL for display
        const imageUrl = await readFileAsDataURL(file);
        elements.originalImage.src = imageUrl;

        elements.processingText.textContent = 'Analyzing image...';
        elements.processingProgress.style.width = '30%';

        // Load image using RawImage
        const image = await RawImage.fromURL(imageUrl);

        elements.processingText.textContent = 'Removing background...';
        elements.processingProgress.style.width = '50%';

        // Process image through model
        const { pixel_values } = await processor(image);

        elements.processingProgress.style.width = '70%';

        // Run inference
        const { output } = await model({ input: pixel_values });

        elements.processingText.textContent = 'Generating result...';
        elements.processingProgress.style.width = '90%';

        // Convert output to mask and apply
        const resultUrl = await applyMask(image, output);

        elements.processingProgress.style.width = '100%';

        // Show results
        elements.resultImage.src = resultUrl;
        elements.processing.style.display = 'none';
        elements.results.style.display = 'block';

    } catch (error) {
        console.error('BGRMV: Processing error:', error);
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
    // Get mask data from model output
    const maskData = maskOutput.data;
    const maskWidth = maskOutput.dims[3];
    const maskHeight = maskOutput.dims[2];

    // Create canvas for the result
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');

    // Create a temporary canvas for the mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskWidth;
    maskCanvas.height = maskHeight;
    const maskCtx = maskCanvas.getContext('2d');
    const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);

    // Convert mask tensor to image data
    for (let i = 0; i < maskData.length; i++) {
        const alpha = Math.round(maskData[i] * 255);
        maskImageData.data[i * 4] = alpha;     // R
        maskImageData.data[i * 4 + 1] = alpha; // G
        maskImageData.data[i * 4 + 2] = alpha; // B
        maskImageData.data[i * 4 + 3] = 255;   // A (fully opaque mask)
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    // Draw original image
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = originalImage.width;
    originalCanvas.height = originalImage.height;
    const originalCtx = originalCanvas.getContext('2d');

    // Convert RawImage to ImageData
    const imgData = originalCtx.createImageData(originalImage.width, originalImage.height);
    for (let i = 0; i < originalImage.data.length; i++) {
        imgData.data[i] = originalImage.data[i];
    }
    originalCtx.putImageData(imgData, 0, 0);

    // Scale mask to original image size
    ctx.drawImage(maskCanvas, 0, 0, originalImage.width, originalImage.height);

    // Get the scaled mask data
    const scaledMaskData = ctx.getImageData(0, 0, originalImage.width, originalImage.height);

    // Apply mask as alpha channel to original image
    const resultData = originalCtx.getImageData(0, 0, originalImage.width, originalImage.height);

    for (let i = 0; i < resultData.data.length / 4; i++) {
        // Use the red channel of the mask as alpha
        resultData.data[i * 4 + 3] = scaledMaskData.data[i * 4];
    }

    // Clear and draw final result
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(resultData, 0, 0);

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
}

function showError(message) {
    elements.error.style.display = 'flex';
    elements.errorMessage.textContent = message;
}

function hideError() {
    elements.error.style.display = 'none';
}
