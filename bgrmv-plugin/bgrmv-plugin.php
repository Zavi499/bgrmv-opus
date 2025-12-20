<?php
/**
 * Plugin Name: Background Remover
 * Plugin URI: https://github.com/bgrmv
 * Description: Remove image backgrounds using AI (Xenova/ModNet) - runs entirely in browser for privacy
 * Version: 1.0.0
 * Author: BGRMV
 * License: GPL v2 or later
 * Text Domain: bgrmv
 */

if (!defined('ABSPATH')) {
    exit;
}

define('BGRMV_VERSION', '1.0.4');
define('BGRMV_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BGRMV_PLUGIN_URL', plugin_dir_url(__FILE__));

class BGRMV_Plugin {

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('bgrmv', array($this, 'render_shortcode'));
        add_shortcode('background_remover', array($this, 'render_shortcode'));
    }

    public function enqueue_scripts() {
        global $post;

        // Only load styles if shortcode is present
        if (is_a($post, 'WP_Post') && (has_shortcode($post->post_content, 'bgrmv') || has_shortcode($post->post_content, 'background_remover'))) {
            // Enqueue styles
            wp_enqueue_style(
                'bgrmv-styles',
                BGRMV_PLUGIN_URL . 'assets/css/bgrmv-styles.css',
                array(),
                BGRMV_VERSION
            );
        }
    }

    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'title' => 'AI Background Remover',
            'theme' => 'light',
        ), $atts, 'bgrmv');

        $script_url = BGRMV_PLUGIN_URL . 'assets/js/bgrmv-script.js?ver=' . BGRMV_VERSION;

        ob_start();
        ?>
        <div id="bgrmv-container" class="bgrmv-container bgrmv-theme-<?php echo esc_attr($atts['theme']); ?>">
            <!-- Header -->
            <div class="bgrmv-header">
                <h2 class="bgrmv-title"><?php echo esc_html($atts['title']); ?></h2>
                <p class="bgrmv-subtitle">Remove backgrounds from your images instantly using AI</p>
            </div>

            <!-- First time notice -->
            <div id="bgrmv-first-time-notice" class="bgrmv-notice bgrmv-notice-info" style="display: none;">
                <div class="bgrmv-notice-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                </div>
                <div class="bgrmv-notice-content">
                    <strong>First-time Setup</strong>
                    <p>The AI model will be downloaded to your device (~25MB). This ensures your images are processed locally for complete privacy - nothing is sent to any server!</p>
                </div>
            </div>

            <!-- Model Loading Status -->
            <div id="bgrmv-model-status" class="bgrmv-model-status" style="display: none;">
                <div class="bgrmv-loader-container">
                    <div class="bgrmv-loader-spinner"></div>
                    <div class="bgrmv-loader-text">
                        <span id="bgrmv-loader-label">Loading AI Model...</span>
                        <span id="bgrmv-loader-percent">0%</span>
                    </div>
                </div>
                <div class="bgrmv-progress-bar">
                    <div id="bgrmv-progress-fill" class="bgrmv-progress-fill" style="width: 0%"></div>
                </div>
                <p id="bgrmv-model-hint" class="bgrmv-hint">This only happens once. The model will be cached for future visits.</p>
            </div>

            <!-- Upload Area -->
            <div id="bgrmv-upload-area" class="bgrmv-upload-area">
                <div class="bgrmv-upload-content">
                    <div class="bgrmv-upload-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                    </div>
                    <p class="bgrmv-upload-text">Drag & drop your image here</p>
                    <p class="bgrmv-upload-subtext">or</p>
                    <label for="bgrmv-file-input" class="bgrmv-upload-btn">Choose File</label>
                    <input type="file" id="bgrmv-file-input" accept="image/*" style="display: none;">
                    <p class="bgrmv-upload-formats">Supports: JPG, PNG, WebP</p>
                </div>
            </div>

            <!-- Processing Status -->
            <div id="bgrmv-processing" class="bgrmv-processing" style="display: none;">
                <div class="bgrmv-processing-spinner"></div>
                <p id="bgrmv-processing-text">Removing background...</p>
                <div class="bgrmv-progress-bar">
                    <div id="bgrmv-processing-progress" class="bgrmv-progress-fill bgrmv-progress-animated" style="width: 0%"></div>
                </div>
            </div>

            <!-- Results Area -->
            <div id="bgrmv-results" class="bgrmv-results" style="display: none;">
                <div class="bgrmv-comparison">
                    <div class="bgrmv-image-container">
                        <span class="bgrmv-image-label">Original</span>
                        <img id="bgrmv-original-image" src="" alt="Original image">
                    </div>
                    <div class="bgrmv-arrow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </div>
                    <div class="bgrmv-image-container bgrmv-result-container">
                        <span class="bgrmv-image-label">Background Removed</span>
                        <img id="bgrmv-result-image" src="" alt="Result image">
                    </div>
                </div>

                <div class="bgrmv-actions">
                    <button id="bgrmv-download-btn" class="bgrmv-btn bgrmv-btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download PNG
                    </button>
                    <button id="bgrmv-new-image-btn" class="bgrmv-btn bgrmv-btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        New Image
                    </button>
                </div>
            </div>

            <!-- Error Display -->
            <div id="bgrmv-error" class="bgrmv-notice bgrmv-notice-error" style="display: none;">
                <div class="bgrmv-notice-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <div class="bgrmv-notice-content">
                    <strong>Error</strong>
                    <p id="bgrmv-error-message"></p>
                </div>
            </div>

            <!-- Privacy Badge -->
            <div class="bgrmv-privacy-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>100% Private - Images processed on your device</span>
            </div>
        </div>

        <!-- Load script as ES Module -->
        <script type="module" src="<?php echo esc_url($script_url); ?>"></script>
        <?php
        return ob_get_clean();
    }
}

// Initialize the plugin
BGRMV_Plugin::get_instance();
