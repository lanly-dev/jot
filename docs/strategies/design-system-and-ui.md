---
title: "Design System & UI Tokens Strategy"
category: strategy
tags: [design-system, ui-tokens, styling, iconography, responsiveness]
last_updated: 2026-10-24
---

# Design System & UI Tokens Strategy

## 1. Aesthetic Identity

Jot uses a warm, playful, modern pastel design language:
- Clean, tactile cards that resemble sticky notes and index cards.
- Curated color palettes with HSL-tailored pastels.
- Subtle micro-animations (lift on hover, pop-in transitions, smooth dropdowns).
- Modern typography via system font stacks and clean heading hierarchies.

## 2. Core Design Tokens (`public/styles.css`)

### 2.1 Color Tokens
- App Background: `--bg-main: #fbf9f6`
- Primary Accent: `--color-primary: #ff758f`
- Light Accent: `--color-primary-light: #ffd1dc`
- Primary Text: `--text-main: #2d2b2a`
- Muted / Secondary Text: `--text-muted: #8a8480`
- Global Borders: `--border-color: #ede7e1`

### 2.2 Card Elevation & Shape
- **Border Width**: `2px solid var(--border-color)` across cards, creators, and list rows.
- **Corner Radius**: `border-radius: 5px` for cards and list items.
- **Card Shadow**: `--card-shadow: 0 4px 12px rgba(45, 43, 42, 0.05)`
- **Hover Lift**:
  ```css
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(45, 43, 42, 0.1);
  ```

### 2.3 Form Input Standards
- **Unified Padding**: All creator inputs across Title, Body, Login, and Payment fields share:
  ```css
  padding: 0.65rem 0.95rem;
  ```
- **Borderless Inputs in Cards**: Inputs inside the expandable creator forms use `border: none; background: rgba(255, 255, 255, 0.85-0.9); outline: none; box-shadow: none;` so they feel integrated with the card body rather than like nested boxes.
- **Password / CVV Reveal Clearance**: Any password or CVV input wrapped in `.password-input-wrap` **must** enforce:
  ```css
  padding-right: 3rem;
  ```
  to prevent text or dots from overlapping with the 32px absolute `.password-reveal-toggle` eye icon.

## 3. Iconography Invariants

- **Standard**: All icons must use SVG outline vectors styled after the Feather / Lucide library:
  ```html
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ...
  </svg>
  ```
- **Stat Pills**: Header counters in both Notes and Vault modes use `<span class="stat-pill">` containing an outline SVG and counter span. Never render raw emojis for UI stat counters or action buttons.
