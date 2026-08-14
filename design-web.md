# Dot-Matrix Editorial — Google Stitch Design Prompt (Web)

An experimental, editorial, black-and-white design system inspired by pixel/dot-matrix typography and dashed technical-drawing aesthetics — adapted for web layouts. Use this as a reusable base prompt — swap `[APP NAME]` and `[MODE]` per screen.

---

## Prompt

```
Using Google Stitch, generate the WEB UI design for "[APP NAME]" in [MODE] mode — an experimental, editorial, dot-matrix black-and-white design system inspired by pixel typography and dashed technical-drawing aesthetics.

DESIGN SYSTEM (apply consistently across all generated screens):

Mode: [MODE] — either "light" or "dark". Do not mix; generate only the specified mode.

Colors (Dark mode):
- Background: true black (#000000)
- Secondary surfaces: near-black with subtle gray separation (#0D0D0D)
- Primary content/cards: off-white (#F5F5F5) blocks used sparingly as high-contrast panels against the black background
- Text on black: white, low-opacity white for muted/secondary text
- Text on white panels: black
- No color accents anywhere — strictly grayscale/monochrome

Colors (Light mode):
- Background: off-white (#F5F5F5)
- Primary content/cards: black or near-black blocks used sparingly as high-contrast panels
- Text: black on white surfaces, white on black surfaces
- No color accents anywhere — strictly grayscale/monochrome

Typography:
- Signature element: large numerals (stats, counters, timestamps, prices) rendered in a DOT-MATRIX / pixel-grid typeface style — digits built from dot patterns, like an old digital display
- Headings/section titles: a distinctive dotted or perforated letterform style, used selectively for emphasis rather than every heading
- Standard clean sans-serif for body copy, navigation, and UI labels — legible and understated, contrasting against the experimental display type
- Occasional vertically-oriented or rotated text (90°) as a stylistic device along page edges, section dividers, or sidebars — used sparingly, not on every screen

Layout & spacing (web-specific):
- Wide, asymmetric editorial layouts rather than centered SaaS-style hero sections — content placed with intentional visual tension, off-grid element positioning
- Dashed/perforated hairline borders (like a "tear here" ticket edge) used for section dividers, table rows, and card outlines instead of solid lines
- Full-bleed high-contrast block panels (solid black or solid white rectangles) used as functional containers that cut across the viewport width, deliberately graphic and poster-like
- Widget-style modular cards/panels arranged in an asymmetric grid — varying card sizes rather than a uniform bento grid, generous internal padding, thin dashed outlines
- Large-format navigation: a bold, oversized top nav or sidebar treated as a graphic element itself, not just a utility bar
- Circular profile/avatar imagery treated with a dotted/perforated ring border instead of a solid ring
- Small circular icon buttons (search, menu, actions) with thin outline strokes, minimal fill
- Generous negative space around key statements/headlines, letting the poster-like composition breathe

Iconography:
- Ultra-thin line icons only, no fills, no color
- Small utility icons (status indicators, social links, metadata icons) rendered in the same dot-matrix pixel style as the numerals for consistency

Interaction & states:
- Minimal, quiet UI chrome — nav items, icons, and labels kept small and unobtrusive so the dot-matrix typography and dashed panels remain the visual focus
- Active/selected/hover states shown via solid black-or-white fill inversion (swap background/foreground) rather than any accent color
- Buttons: solid inverted-fill blocks (black button on white background / white button on black background), no rounded pill shapes — sharp or minimally rounded corners to keep the graphic, poster-like feel

Tone:
- Experimental, high-fashion, editorial-tech aesthetic — feels like a design studio's showcase site or concept product page, not a conventional SaaS marketing site
- Strictly monochrome, no gradients, no color accents, no soft drop shadows — flat, graphic, poster-like
- Should feel bold, confident, and slightly avant-garde rather than "friendly SaaS"

Generate a high-fidelity web UI design following this design system exactly as specified above, in [MODE] mode.
```

---

## Usage Notes

- Fill in `[APP NAME]` with the product name, and set `[MODE]` to `light` or `dark` for each screen you generate.
- This is a distinct design language from the core Noirly brand (deep charcoal + electric cyan) and from the monochrome-SaaS style — it's experimental/editorial rather than production-utility.
- Best suited for design-forward showcase pieces (e.g. a portfolio site, a concept product landing page) rather than across the full practical app suite, since the dot-matrix numerals and asymmetric layout trade off some conventional usability for style.
