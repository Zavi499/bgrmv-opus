/**
 * BGRMV - Background Remover Plugin
 * Uses Xenova/modnet for client-side background removal
 */

(function() {
    'use strict';

    // Configuration
    const MODEL_ID = 'Xenova/modnet';
    const CACHE_KEY = 'bgrmv_model_loaded';

    // State
    let pipeline = null;
    let isModelLoading = false;
    let isProcessing = false;

    // DOM Elements
    let elements = {};

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

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
        if (pipeline || isModelLoading) return;

        isModelLoading = true;

        try {
            // Check if Transformers is available
            if (typeof Transformers === 'undefined' && typeof window.Transformers === 'undefined') {
                console.log('BGRMV: Waiting for Transformers.js to load...');
                await waitForTransformers();
            }

            const transformers = window.Transformers || Transformers;

            // Configure to use IndexedDB cache
            transformers.env.useBrowserCache = true;
            transformers.env.allowLocalModels = false;

            console.log('BGRMV: Starting model preload...');

            // Create pipeline with progress callback
            pipeline = await transformers.pipeline('image-segmentation', MODEL_ID, {
                progress_callback: handleModelProgress,
                device: 'webgpu',
                dtype: 'fp32'
            });

            console.log('BGRMV: Model loaded successfully');

            // Mark as loaded
            localStorage.setItem(CACHE_KEY, 'true');

            // Hide first time notice
            elements.firstTimeNotice.style.display = 'none';

        } catch (error) {
            console.error('BGRMV: Error loading model:', error);

            // Try fallback without WebGPU
            try {
                const transformers = window.Transformers || Transformers;
                pipeline = await transformers.pipeline('image-segmentation', MODEL_ID, {
                    progress_callback: handleModelProgress
                });
                localStorage.setItem(CACHE_KEY, 'true');
                elements.firstTimeNotice.style.display = 'none';
            } catch (fallbackError) {
                console.error('BGRMV: Fallback also failed:', fallbackError);
                showError('Failed to load AI model. Please refresh and try again.');
            }
        } finally {
            isModelLoading = false;
            elements.modelStatus.style.display = 'none';
        }
    }

    function waitForTransformers() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;

            const check = () => {
                attempts++;
                if (typeof Transformers !== 'undefined' || typeof window.Transformers !== 'undefined') {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Transformers.js failed to load'));
                } else {
                    setTimeout(check, 200);
                }
            };

            check();
        });
    }

    function handleModelProgress(progress) {
        if (!progress || progress.status === 'ready') {
            elements.modelStatus.style.display = 'none';
            return;
        }

        elements.modelStatus.style.display = 'block';

        if (progress.status === 'download' || progress.status === 'progress') {
            const percent = progress.progress ? Math.round(progress.progress) : 0;
            elements.loaderLabel.textContent = progress.file ? `Loading ${progress.file}...` : 'Loading AI Model...';
            elements.loaderPercent.textContent = `${percent}%`;
            elements.progressFill.style.width = `${percent}%`;
        } else if (progress.status === 'init' || progress.status === 'loading') {
            elements.loaderLabel.textContent = 'Initializing model...';
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

        hideError();

        // Show processing state
        elements.uploadArea.style.display = 'none';
        elements.results.style.display = 'none';
        elements.processing.style.display = 'block';
        elements.processingText.textContent = 'Preparing image...';
        elements.processingProgress.style.width = '10%';

        try {
            // Load model if not ready
            if (!pipeline) {
                elements.processingText.textContent = 'Loading AI model...';
                elements.modelStatus.style.display = 'block';
                await preloadModel();
                elements.modelStatus.style.display = 'none';
            }

            if (!pipeline) {
                throw new Error('Model failed to load');
            }

            // Read file as data URL
            const imageUrl = await readFileAsDataURL(file);
            elements.originalImage.src = imageUrl;

            elements.processingText.textContent = 'Removing background...';
            elements.processingProgress.style.width = '30%';

            // Process image
            const result = await pipeline(imageUrl);

            elements.processingProgress.style.width = '80%';
            elements.processingText.textContent = 'Generating result...';

            // Apply mask to image
            const resultUrl = await applyMask(imageUrl, result);

            elements.processingProgress.style.width = '100%';

            // Show results
            elements.resultImage.src = resultUrl;
            elements.processing.style.display = 'none';
            elements.results.style.display = 'block';

        } catch (error) {
            console.error('BGRMV: Processing error:', error);
            showError('Failed to process image: ' + error.message);
            resetToUpload();
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

    async function applyMask(imageUrl, segmentationResult) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');

                    // Draw original image
                    ctx.drawImage(img, 0, 0);

                    // Get the mask from segmentation result
                    // ModNet returns a single mask for the person/foreground
                    let maskData = null;

                    if (segmentationResult && segmentationResult.length > 0) {
                        // Find the mask (usually first result or look for specific label)
                        const segment = segmentationResult[0];
                        if (segment.mask) {
                            maskData = segment.mask;
                        }
                    }

                    if (maskData) {
                        // Create mask canvas
                        const maskCanvas = document.createElement('canvas');
                        maskCanvas.width = maskData.width;
                        maskCanvas.height = maskData.height;
                        const maskCtx = maskCanvas.getContext('2d');

                        const maskImageData = maskCtx.createImageData(maskData.width, maskData.height);

                        // Convert mask data to image data
                        for (let i = 0; i < maskData.data.length; i++) {
                            const alpha = Math.round(maskData.data[i] * 255);
                            maskImageData.data[i * 4] = 255;     // R
                            maskImageData.data[i * 4 + 1] = 255; // G
                            maskImageData.data[i * 4 + 2] = 255; // B
                            maskImageData.data[i * 4 + 3] = alpha; // A
                        }

                        maskCtx.putImageData(maskImageData, 0, 0);

                        // Apply mask to original image
                        const resultCanvas = document.createElement('canvas');
                        resultCanvas.width = img.width;
                        resultCanvas.height = img.height;
                        const resultCtx = resultCanvas.getContext('2d');

                        // Draw scaled mask
                        resultCtx.drawImage(maskCanvas, 0, 0, img.width, img.height);

                        // Use mask as alpha channel
                        resultCtx.globalCompositeOperation = 'source-in';
                        resultCtx.drawImage(img, 0, 0);

                        resolve(resultCanvas.toDataURL('image/png'));
                    } else {
                        // Fallback: return original if no mask found
                        console.warn('BGRMV: No mask found in result');
                        resolve(canvas.toDataURL('image/png'));
                    }
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
        });
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

})();
