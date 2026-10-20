# Reference design — 20 October 2026

The public website follows the supplied design: ivory background, navy typography and pill buttons, mint panels and lime accents. The homepage has a suitcase/airplane hero, four reporting shortcuts, a three-part process, an airplane-window banner and accessible FAQ disclosures. The same identity is used in the report form, information pages and staff area.

The reference's baggage shortcut is replaced by refunds to respect the requested reporting scope. Baggage, service refusal/treatment and holiday-package/hotel categories are retired for new reports. Historical reports remain readable. New contact permission is recorded separately as `caseContact`; earlier `legalContact` consent is not reinterpreted.

## Assets

- `public/images/hero-luggage.webp`: 1080 × 1080, approximately 81 KB.
- `public/images/flight-window.webp`: 1800 × 600, approximately 73 KB.
- `public/images/organization-logo.jpg`: the user's supplied airplane/trails Hebrew logo, copied unchanged. `BrandMark.vue` uses an SVG viewport to remove the surrounding whitespace at display time. The browser icon embeds the same image and frames the airplane. This replaces the earlier shield/wing mark across the header, footer, staff sign-in and staff sidebar.

The two raster images were generated with the built-in image generation tool, using the supplied image as a visual reference, then proportionally resized and converted to WebP. All interface text is real selectable Hebrew rendered by Vue, rather than embedded in artwork. Assistant is served locally under its bundled font license.

Final hero prompt: Preserve the polished teal ribbed wheeled suitcase, lime luggage tag with navy airplane symbol, and white passenger plane. Render smooth clouds, pale mint organic backdrop and soft grounded shadow on opaque ivory #fffefa. Keep the complete subjects in a square composition. No text, watermark or page interface.

Banner prompt: Panoramic 3:1 photorealistic cabin scene. On the right, an airplane window frames an aircraft wing above clouds at sunset. The left two thirds fades into deep navy #052c43 cabin wall, leaving room for HTML text. No text, watermark or interface.

Responsive verification covers the normal desktop browser and a 390 × 844 mobile viewport, including navigation, form review and a complete fictional local submission. Screenshot previews are stored locally in `website_screenshots/`; they are not required application assets.
