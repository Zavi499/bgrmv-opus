=== Background Remover ===
Contributors: bgrmv
Tags: background removal, image editing, ai, modnet, transformers
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Remove image backgrounds using AI - runs entirely in browser for complete privacy.

== Description ==

Background Remover is a powerful WordPress plugin that allows your website visitors to remove backgrounds from their images using AI technology. The best part? Everything runs directly in the user's browser, ensuring complete privacy - no images are ever uploaded to any server.

**Key Features:**

* **100% Client-Side Processing** - All image processing happens in the user's browser
* **AI-Powered** - Uses the Xenova/ModNet model for accurate background removal
* **Privacy First** - Images never leave the user's device
* **Model Caching** - The AI model is cached locally for faster subsequent uses
* **Modern UI** - Clean, responsive interface with drag-and-drop support
* **Easy Download** - One-click download of processed images as PNG

== Installation ==

1. Upload the `bgrmv-plugin` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Add the shortcode `[bgrmv]` or `[background_remover]` to any page or post

== Usage ==

Simply add the shortcode to any page or post:

`[bgrmv]`

Or with custom attributes:

`[bgrmv title="Remove Background" theme="dark"]`

**Available Attributes:**

* `title` - Custom title for the tool (default: "AI Background Remover")
* `theme` - Color theme: "light" or "dark" (default: "light")

== Frequently Asked Questions ==

= Are my images uploaded to a server? =

No! All image processing happens directly in your browser. Your images never leave your device, ensuring complete privacy.

= Why does it take time on first use? =

On the first use, the AI model (~25MB) needs to be downloaded to your browser. This is cached locally, so subsequent uses will be much faster.

= What image formats are supported? =

The plugin supports JPG, PNG, and WebP formats. Maximum file size is 10MB.

= Does this work on mobile devices? =

Yes, the plugin works on mobile devices, though processing may be slower on less powerful devices.

== Changelog ==

= 1.0.0 =
* Initial release
* Client-side background removal using Xenova/ModNet
* Model caching for faster subsequent uses
* Drag-and-drop file upload
* PNG download with transparency
* Light and dark theme support

== Upgrade Notice ==

= 1.0.0 =
Initial release of Background Remover plugin.
