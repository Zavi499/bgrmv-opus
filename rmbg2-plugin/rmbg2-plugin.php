<?php
/**
 * Plugin Name: RMBG 2.0 Background Remover
 * Plugin URI: https://example.com/rmbg2-plugin
 * Description: Remove image backgrounds using BriaAI RMBG-2.0 model running entirely in the browser. State-of-the-art quality with complete privacy.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: rmbg2-plugin
 */

if (!defined('ABSPATH')) {
    exit;
}

define('RMBG2_VERSION', '1.0.0');
define('RMBG2_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('RMBG2_PLUGIN_URL', plugin_dir_url(__FILE__));

class RMBG2_Plugin {

    public function __construct() {
        add_shortcode('rmbg2', array($this, 'render_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_styles'));
    }

    public function enqueue_styles() {
        wp_enqueue_style(
            'rmbg2-styles',
            RMBG2_PLUGIN_URL . 'assets/css/rmbg2-styles.css',
            array(),
            RMBG2_VERSION
        );
    }

    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'title' => 'AI Background Remover Pro',
        ), $atts, 'rmbg2');

        $script_url = RMBG2_PLUGIN_URL . 'assets/js/rmbg2-script.js?ver=' . RMBG2_VERSION;

        ob_start();
        ?>
        <div id="rmbg2-container" class="rmbg2-container">
            <!-- First Time Notice -->
            <div id="rmbg2-first-time-notice" class="rmbg2-notice" style="display: none;">
                <div class="rmbg2-notice-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <div class="rmbg2-notice-content">
                    <strong>Your Privacy is Protected</strong>
                    <p>This tool uses RMBG-2.0, a state-of-the-art AI that runs entirely in your browser. Your images are never uploaded to any server.</p>
                </div>
            </div>

            <!-- Model Loading Status -->
            <div id="rmbg2-model-status" class="rmbg2-model-status" style="display: none;">
                <div class="rmbg2-loader-text">
                    <span id="rmbg2-loader-label">Loading AI Model...</span>
                    <span id="rmbg2-loader-percent">0%</span>
                </div>
                <div class="rmbg2-progress-bar">
                    <div id="rmbg2-progress-fill" class="rmbg2-progress-fill"></div>
                </div>
                <p id="rmbg2-model-hint" class="rmbg2-hint">First-time download (~370MB). The model will be cached for future visits.</p>
            </div>

            <!-- Upload Area -->
            <div id="rmbg2-upload-area" class="rmbg2-upload-area">
                <div class="rmbg2-upload-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                </div>
                <p class="rmbg2-upload-text">Drag & drop your image here</p>
                <p class="rmbg2-upload-subtext">or click to browse</p>
                <p class="rmbg2-upload-formats">Supports: JPG, PNG, WebP (Max 10MB)</p>
                <input type="file" id="rmbg2-file-input" accept="image/*" style="display: none;">
            </div>

            <!-- Processing State -->
            <div id="rmbg2-processing" class="rmbg2-processing" style="display: none;">
                <div class="rmbg2-spinner"></div>
                <p id="rmbg2-processing-text">Processing image...</p>
                <div class="rmbg2-progress-bar rmbg2-processing-bar">
                    <div id="rmbg2-processing-progress" class="rmbg2-progress-fill"></div>
                </div>
            </div>

            <!-- Results -->
            <div id="rmbg2-results" class="rmbg2-results" style="display: none;">
                <div class="rmbg2-comparison">
                    <div class="rmbg2-image-container">
                        <span class="rmbg2-label">Original</span>
                        <img id="rmbg2-original-image" src="" alt="Original image">
                    </div>
                    <div class="rmbg2-image-container">
                        <span class="rmbg2-label">Background Removed</span>
                        <div class="rmbg2-result-wrapper">
                            <img id="rmbg2-result-image" src="" alt="Result image">
                        </div>
                    </div>
                </div>
                <div class="rmbg2-actions">
                    <button id="rmbg2-download-btn" class="rmbg2-btn rmbg2-btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download PNG
                    </button>
                    <button id="rmbg2-new-image-btn" class="rmbg2-btn rmbg2-btn-secondary">
                        Process Another Image
                    </button>
                </div>
            </div>

            <!-- Error State -->
            <div id="rmbg2-error" class="rmbg2-error" style="display: none;">
                <div class="rmbg2-error-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <p id="rmbg2-error-message">An error occurred</p>
            </div>
        </div>

        <script type="module" src="<?php echo esc_url($script_url); ?>"></script>
        <?php
        return ob_get_clean();
    }
}

new RMBG2_Plugin();
