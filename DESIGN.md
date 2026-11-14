---
name: MournHub
description: Memorial stationery on plain cream card, opening on a polished granite headstone.
colors:
  stone: "#f6f3ec"
  inlay: "#fbfaf6"
  ink: "#2e3b34"
  accent: "#3e5c4c"
  text-quiet: "#5c6b60"
  sage-edge: "#7c8b7f"
  card-line: "#dcd9cc"
  field: "#ffffff"
  hover-wash: "#edeae0"
  gilt: "#d4af58"
  gilt-hover: "#c9a34a"
  granite: "#262f2a"
  granite-base: "#232b27"
  danger: "#8f4a3a"
  candle-lit-edge: "#8a6414"
  candle-lit-text: "#6f4f0d"
  flame: "#c98a2b"
  flame-core: "#f0c060"
typography:
  display:
    fontFamily: "EB Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(2.7rem, 5.6vw, 4.7rem)"
    fontWeight: 400
    lineHeight: 1.06
  section:
    fontFamily: "EB Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(2rem, 3.6vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.12
  body:
    fontFamily: "EB Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(1.2rem, 0.4vw + 1.1rem, 1.35rem)"
    fontWeight: 400
    lineHeight: 1.5
  inscription:
    fontFamily: "Marcellus, Optima, Candara, serif"
    fontSize: "clamp(2.1rem, 6.4vw, 3.6rem)"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "0.05em"
  control:
    fontFamily: "Alegreya Sans, Gill Sans, Trebuchet MS, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  plate: "4px"
  base: "3px"
  control: "10px"
  tile: "16px"
  photo: "50%"
spacing:
  pad: "clamp(20px, 6vw, 72px)"
  gap: "clamp(28px, 4vw, 56px)"
components:
  button-primary:
    backgroundColor: "{colors.gilt}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
  button-primary-hover:
    backgroundColor: "{colors.gilt-hover}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.stone}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
  tile:
    backgroundColor: "{colors.inlay}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
---

# Design System: MournHub

## Overview

**North Star: "The Order of Service."** MournHub should look like the printed card handed out at a funeral: cream stock, a classic serif, centred lines and thin rules. The landing page opens on something anyone recognises at once, a dark granite headstone with gold lettering, with the real QR code set into it as a plate.

It replaced an earlier direction, The Letter-Cutter's Slate, after the owner said that design looked AI-made and not like a memorial. Don't bring back what that design relied on: stone textures across the page, filtered cut lettering, a moving light, bevelled buttons, a dashed layout line, or every section sitting in its own box.

## Colors

Cream card and dark green ink do almost all the work. Gold is reserved for the main action and for lettering on granite.

- **Stone** (#f6f3ec) is the page. **Inlay** (#fbfaf6) is a tile on it.
- **Ink** (#2e3b34) is text. **Text quiet** (#5c6b60) is for dates, captions and supporting lines.
- **Accent** (#3e5c4c) is ordinary working buttons and focus rings.
- **Gilt** (#d4af58) is one main action per view, and the lettering on the headstone.
- **Granite** (#262f2a) appears only on the headstone, under `public/img/granite.webp`.
- **Card line** (#dcd9cc) is every thin rule and tile border.

**The One Gold Rule.** A view has one gold button. If everything is gold, nothing reads as the next step.

## Typography

Three faces, each with one job, all self-hosted.

- **EB Garamond** sets headlines and reading text. Headlines stay regular weight and sentence case, as on printed stationery.
- **Marcellus** is the inscription face. It sets a person's name in spaced capitals, and the wordmark, "In loving memory of" and short list headings in ordinary title case.
- **Alegreya Sans** is for controls: buttons, labels, fields, navigation and status tags.

**The Names Only Rule.** Spaced capitals belong to the names of the people being remembered. Page headings never use them.

**The Upright Rule.** Nothing is set in italics. Headings stay upright and formal.

## Layout

Pages are centred, with one reading column wherever the content allows, like an order of service. Landing sections are separated by a single thin rule. Lists pair a name on the left with its words on the right, and stack on phones. The header stays fixed to the top of the page as you scroll, above the content but below the candle glow. Only the first view of the landing page and the staff memorial form use two columns.

## Elevation & Depth

The pages are flat, with no drop shadows or insets. Depth belongs only to the headstone, as a thin highlight along its top edge.

## Shapes

- **Rounded Tile.** Tiles use 16px, controls use 10px.
- **Circle Photo.** The portrait of the person is always a circle. Gallery photos keep their own shape with a 10px corner, uncropped, and each one opens in full when chosen.
- **Square Code.** QR codes stay square, so they scan.

## Motion

**Motion follows the printed card.** Things are set, ruled and lit. They don't fly, rise or bounce. All of it lives in `public/css/motion.css` and `public/js/motion.js`.

- **The one authored moment:** on the landing page's headstone, the inscription is set line by line from the centre, the code plate appears, and then the candle is lit. It waits until the headstone is in view.
- **Moving through the landing page:** each section's thin rule draws out from the centre. Only sequences arrive in sequence: Write, Publish, Place, and the sample memorial. Other sections don't animate.
- **Between pages:** a 240ms crossfade with the wordmark held in place. Browsers without view transitions change pages instantly.
- **A family's page:** the name is set once in under a second, and the story is never delayed.
- **Working pages:** feedback and state only, with no entrance choreography.
- **Loading:** one circle everywhere, a quiet ring with a turning arc. A button shows it beside its label from the moment it's pressed until the answer or the next page arrives, and a photo's place shows it until the photo fades in. Under reduced motion it holds still and fades gently instead of turning.
- **Timing:** feedback 100 to 150ms, state changes up to 400ms, the authored moment under 2s. Ease out with `--ease-settle`, never bounce.
- **Content is visible by default.** A failed script or stylesheet must never hide anything, and hidden starting states are only set up by script.
- **Reduced motion:** nothing moves. State changes stay as short fades, and the flames hold still.

## Components

- **Headstone.** Arched granite on a wider base, lettered in gold, with the QR code on a pale plate and one lit candle at the side. The code must always decode.
- **Tiles.** Only for what staff work on: forms, memorial rows, and the sign-in card. Reading content on the family's page never sits in a tile, and neither do photos on the gallery page.
- **Buttons.** Gold for the main action, green for working buttons, outlined for secondary ones, and at least 44px tall.
- **Candle.** An unlit candle has a wick and no flame. Lighting one kindles the flame, starts it flickering and sends a soft gold glow across the page, which fades within a few seconds. The landing page's sample behaves the same way as a real memorial, but saves nothing. Both stop under reduced motion, and lighting a candle never needs an account.

## Do's and Don'ts

### Do:

- Let the family's page read like a printed tribute, with the name as its largest element.
- Label a sample as a sample. Maria Santos isn't a real person, and the page says so.
- Keep "In loving memory of" above the name.

### Don't:

- Don't put reading content in cards, or use grids of icon cards.
- Don't add textures, filters, gradients, glows or animated light to the page. The one exception is the brief glow when someone lights a candle.
- Don't make it sentimental with doves, clouds, sunsets or stock grief imagery.
- Don't make it look like a tech startup with feature grids, metrics or badges.
