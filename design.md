# Dot-Matrix Editorial — Google Stitch Design Prompt

An experimental, editorial, black-and-white design system inspired by pixel/dot-matrix typography and dashed technical-drawing aesthetics. Use this as a reusable base prompt — swap `[APP NAME]` and `[MODE]` per screen.

---

## Prompt

```
Using Google Stitch, generate the mobile UI design for "[APP NAME]" in [MODE] mode — an experimental, editorial, dot-matrix black-and-white design system inspired by pixel typography and dashed technical-drawing aesthetics.

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
- Signature element: large numerals (clock, time, key stats) rendered in a DOT-MATRIX / pixel-grid typeface style — digits built from dot patterns, like an old digital display
- Body/label text: a distinctive dotted or perforated letterform style for headings/names (dot-outline character style), used selectively for emphasis (e.g. user name, section titles)
- Standard clean sans-serif for regular body copy, small labels, and menu items — legible and understated, contrasting against the experimental display type
- Text is often rotated 90° or oriented vertically along screen edges as a stylistic device (side-running labels, timestamps)

Layout & spacing:
- Dashed/perforated hairline borders (like a "tear here" ticket edge) used to divide cards and sections instead of solid lines
- Widget-style modular cards floating on the black/white base — settings tiles, weather widgets, status panels — each with generous internal padding and thin dashed outlines
- Circular profile photo treated with a dotted/perforated ring border instead of a solid ring
- High contrast block panels (solid black or solid white rectangle) used as functional containers cutting across the screen, deliberately graphic and poster-like
- Small circular icon buttons (search, avatar, action buttons) with thin outline strokes, minimal fill
- Asymmetric, poster/editorial composition rather than a conventional grid — elements placed with intentional visual tension, not centered by default

Iconography:
- Ultra-thin line icons only, no fills, no color
- Small social/utility icons (wifi, battery, app icons) rendered in the same dot-matrix pixel style as the numerals for consistency

Interaction & states:
- Minimal, quiet UI chrome — status bar elements, icons, and labels kept small and unobtrusive so the dot-matrix typography and dashed panels remain the visual focus
- Active/selected states shown via solid black-or-white fill inversion (swap background/foreground) rather than any accent color

Tone:
- Experimental, high-fashion, editorial-tech aesthetic — feels like a concept OS or design-studio showcase piece, not a conventional consumer app
- Strictly monochrome, no gradients, no color accents, no soft shadows — flat, graphic, poster-like
- Should feel bold, confident, and slightly avant-garde rather than "friendly SaaS"

Generate a high-fidelity mobile UI design following this design system exactly as specified above, in [MODE] mode.
```

---

## Usage Notes

- Fill in `[APP NAME]` with the product name, and set `[MODE]` to `light` or `dark` for each screen you generate.
- This is a distinct design language from the core Noirly brand (deep charcoal + electric cyan) and from the monochrome-SaaS style — it's experimental/editorial rather than production-utility.
- Best suited for design-forward showcase pieces (e.g. a concept clock/weather widget, a portfolio demo) rather than across the full practical app suite, since the dot-matrix numerals trade off some readability for style.
