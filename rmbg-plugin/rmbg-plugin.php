<?php
/**
 * Plugin Name: RMBG Background Remover
 * Plugin URI: https://example.com/rmbg-plugin
 * Description: Remove image backgrounds using BriaAI RMBG-1.4 model running entirely in the browser. No server processing, complete privacy.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: rmbg-plugin
 */

if (!defined('ABSPATH')) {
    exit;
}

define('RMBG_VERSION', '1.0.0');
define('RMBG_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('RMBG_PLUGIN_URL', plugin_dir_url(__FILE__));

class RMBG_Plugin {

    public function __construct() {
        add_shortcode('rmbg', array($this, 'render_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_styles'));
    }

    public function enqueue_styles() {
        wp_enqueue_style(
            'rmbg-styles',
            RMBG_PLUGIN_URL . 'assets/css/rmbg-styles.css',
            array(),
            RMBG_VERSION
        );
    }

    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'title' => 'AI Background Remover',
        ), $atts, 'rmbg');

        $script_url = RMBG_PLUGIN_URL . 'assets/js/rmbg-script.js?ver=' . RMBG_VERSION;

        ob_start();
        ?>
        <div id="rmbg-container" class="rmbg-container">
            <!-- First Time Notice -->
            <div id="rmbg-first-time-notice" class="rmbg-notice" style="display: none;">
                <div class="rmbg-notice-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <div class="rmbg-notice-content">
                    <strong>Your Privacy is Protected</strong>
                    <p>This tool uses AI that runs entirely in your browser. Your images are never uploaded to any server - all processing happens on your device.</p>
                </div>
            </div>

            <!-- Model Loading Status -->
            <div id="rmbg-model-status" class="rmbg-model-status" style="display: none;">
                <div class="rmbg-loader-text">
                    <span id="rmbg-loader-label">Loading AI Model...</span>
                    <span id="rmbg-loader-percent">0%</span>
                </div>
                <div class="rmbg-progress-bar">
                    <div id="rmbg-progress-fill" class="rmbg-progress-fill"></div>
                </div>
                <p id="rmbg-model-hint" class="rmbg-hint">First-time download (~45MB). The model will be cached for future visits.</p>
            </div>

            <!-- Upload Area -->
            <div id="rmbg-upload-area" class="rmbg-upload-area">
                <div class="rmbg-upload-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                </div>
                <p class="rmbg-upload-text">Drag & drop your image here</p>
                <p class="rmbg-upload-subtext">or click to browse</p>
                <p class="rmbg-upload-formats">Supports: JPG, PNG, WebP (Max 10MB)</p>
                <input type="file" id="rmbg-file-input" accept="image/*" style="display: none;">
            </div>

            <!-- Processing State -->
            <div id="rmbg-processing" class="rmbg-processing" style="display: none;">
                <div class="rmbg-spinner"></div>
                <p id="rmbg-processing-text">Processing image...</p>
                <div class="rmbg-progress-bar rmbg-processing-bar">
                    <div id="rmbg-processing-progress" class="rmbg-progress-fill"></div>
                </div>
            </div>

            <!-- Results -->
            <div id="rmbg-results" class="rmbg-results" style="display: none;">
                <div class="rmbg-comparison">
                    <div class="rmbg-image-container">
                        <span class="rmbg-label">Original</span>
                        <img id="rmbg-original-image" src="" alt="Original image">
                    </div>
                    <div class="rmbg-image-container">
                        <span class="rmbg-label">Background Removed</span>
                        <div class="rmbg-result-wrapper">
                            <img id="rmbg-result-image" src="" alt="Result image">
                        </div>
                    </div>
                </div>
                <div class="rmbg-actions">
                    <button id="rmbg-download-btn" class="rmbg-btn rmbg-btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download PNG
                    </button>
                    <button id="rmbg-new-image-btn" class="rmbg-btn rmbg-btn-secondary">
                        Process Another Image
                    </button>
                </div>
            </div>

            <!-- Error State -->
            <div id="rmbg-error" class="rmbg-error" style="display: none;">
                <div class="rmbg-error-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <p id="rmbg-error-message">An error occurred</p>
            </div>
        </div>

        <script type="module" src="<?php echo esc_url($script_url); ?>"></script>
        <?php
        return ob_get_clean();
    }
}

new RMBG_Plugin();
