=== RMBG 2.0 Background Remover ===
Contributors: yourname
Tags: background removal, image editing, AI, RMBG, BriaAI, RMBG-2.0
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Remove image backgrounds using BriaAI RMBG-2.0, the latest state-of-the-art model running entirely in the browser.

== Description ==

RMBG 2.0 Background Remover uses BriaAI's latest RMBG-2.0 model, built on the BiRefNet architecture, for superior background removal directly in your browser.

**Features:**

* State-of-the-art AI using RMBG-2.0 (BiRefNet architecture)
* Exceptional quality for complex edges (hair, fur, fine details)
* 100% client-side processing - images never leave your device
* Model cached in browser for faster subsequent use
* Modern, responsive UI with green theme
* Drag & drop image upload
* Download results as PNG with transparency

**Privacy:**

This plugin processes all images locally in your browser using WebAssembly. No images are ever uploaded to any server, ensuring complete privacy.

**Note:**

RMBG-2.0 is a larger model (~370MB) and requires more memory than RMBG-1.4. If you experience issues, try the RMBG-1.4 plugin instead.

== Installation ==

1. Upload the `rmbg2-plugin` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Add the `[rmbg2]` shortcode to any page or post

== Usage ==

Simply add the shortcode `[rmbg2]` to any page or post where you want the background remover to appear.

== Frequently Asked Questions ==

= Are my images uploaded to a server? =

No. All processing happens locally in your browser. Your images never leave your device.

= How large is the AI model? =

The RMBG-2.0 model is approximately 370MB (quantized). It's downloaded once and cached in your browser.

= What's the difference between RMBG-1.4 and RMBG-2.0? =

RMBG-2.0 uses the newer BiRefNet architecture and provides better results for complex edges like hair and fur, but requires more memory.

= What image formats are supported? =

JPG, PNG, and WebP images up to 10MB in size.

== Changelog ==

= 1.0.0 =
* Initial release
* BriaAI RMBG-2.0 model integration
* BiRefNet architecture for superior edge detection
* Client-side processing with WebAssembly
* Modern responsive UI with green theme
