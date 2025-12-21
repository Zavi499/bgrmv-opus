=== RMBG Background Remover ===
Contributors: yourname
Tags: background removal, image editing, AI, RMBG, BriaAI
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Remove image backgrounds using BriaAI RMBG-1.4 AI model running entirely in the browser. No server processing, complete privacy.

== Description ==

RMBG Background Remover uses the state-of-the-art BriaAI RMBG-1.4 model to remove backgrounds from images directly in your browser. Your images never leave your device.

**Features:**

* AI-powered background removal using RMBG-1.4
* 100% client-side processing - images never leave your device
* Model cached in browser for faster subsequent use
* Modern, responsive UI
* Drag & drop image upload
* Download results as PNG with transparency
* Works on mobile devices

**Privacy:**

This plugin processes all images locally in your browser using WebAssembly. No images are ever uploaded to any server, ensuring complete privacy.

== Installation ==

1. Upload the `rmbg-plugin` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Add the `[rmbg]` shortcode to any page or post

== Usage ==

Simply add the shortcode `[rmbg]` to any page or post where you want the background remover to appear.

== Frequently Asked Questions ==

= Are my images uploaded to a server? =

No. All processing happens locally in your browser using WebAssembly. Your images never leave your device.

= How large is the AI model? =

The RMBG-1.4 model is approximately 45MB. It's downloaded once and cached in your browser for future visits.

= What image formats are supported? =

JPG, PNG, and WebP images up to 10MB in size.

= Does it work on mobile? =

Yes, the plugin works on mobile browsers, though processing may be slower on less powerful devices.

== Changelog ==

= 1.0.0 =
* Initial release
* BriaAI RMBG-1.4 model integration
* Client-side processing with WebAssembly
* Modern responsive UI
* Drag & drop upload
* PNG download with transparency
