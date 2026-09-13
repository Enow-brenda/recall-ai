---
name: Recall
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf2'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e5efff'
  surface-container-high: '#dbe9ff'
  surface-container-highest: '#d4e4fa'
  on-surface: '#0d1c2d'
  on-surface-variant: '#45464d'
  inverse-surface: '#233143'
  inverse-on-surface: '#e9f1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e5'
  on-secondary-container: '#626567'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e0e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9ff'
  on-background: '#0d1c2d'
  surface-variant: '#d4e4fa'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width-content: 800px
---

## Brand & Style
The design system for this product centers on the concept of **Intelligent Memory**. It positions the interface as a reliable, ambient extension of the user's mind—always present but never intrusive. 

The aesthetic is **Refined Minimalism** with a **Text-Forward** focus. It leverages heavy whitespace and a restricted color palette to ensure information density remains readable and "light." The emotional response is one of clarity and confidence; the UI acts as a calm, high-contrast canvas where the user's data is the hero. Visual noise is aggressively eliminated to facilitate effortless retrieval and focus.

## Colors
This design system utilizes a high-contrast, professional palette designed for long-form reading and quick scanning.

- **Primary (#0F172A):** Deep Indigo/Slate used for primary text, iconography, and heavy UI elements. It provides the "weight" of authority and intelligence.
- **Secondary (#F8FAFC):** An Off-white used as the foundational surface color to reduce eye strain compared to pure white.
- **Accent (#EA580C):** Sunset Orange is used sparingly for Call-to-Actions (CTAs), search highlights, and "new" memory indicators to draw immediate focus.
- **Neutral (#94A3B8):** Cool grays are reserved for borders, secondary metadata, and placeholder states.

## Typography
The typography system uses **Inter** for its systematic, utilitarian, and highly legible qualities. 

Hierarchy is established through weight and color rather than excessive size shifts. Large headings use tighter letter spacing for a more "designed" editorial feel. Body text maintains a generous line height to ensure that chat transcripts and email summaries remain readable during deep focus sessions. Labels use uppercase styling and increased tracking for metadata categorization.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The sidebar navigation is fixed, while the primary chat/memory feed is centered with a maximum width of 800px to maintain optimal line lengths for reading.

- **Desktop:** 12-column grid within the content container; 32px margins.
- **Tablet:** 8-column grid; 24px margins.
- **Mobile:** Single column fluid layout; 16px margins.

Spacing follows a strict 4px/8px rhythm to ensure vertical alignment. Content blocks use the `lg` (40px) spacing to create "islands" of information, reinforcing the minimalist aesthetic.

## Elevation & Depth
This design system avoids heavy shadows, instead using **Tonal Layers** and **Low-Contrast Outlines** to define hierarchy.

- **Surface Level 0:** The main background (#F8FAFC).
- **Surface Level 1 (Cards/Inputs):** Pure White (#FFFFFF) with a 1px border (#E2E8F0).
- **Surface Level 2 (Modals/Popovers):** Pure White with a subtle, diffused 15% opacity Indigo shadow (0px 4px 20px) to indicate interaction.

Depth is primarily communicated through layering rather than light sources, keeping the interface feeling "flat" and digital-first.

## Shapes
The shape language is **Soft (0.25rem)**. This provides a subtle modern touch without feeling overly playful or "bubbly."

- **Standard Buttons & Inputs:** 4px (0.25rem) radius.
- **Memory Cards:** 8px (0.5rem) radius for a slightly more defined container feel.
- **Source Chips:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

- **Conversational Input:** A persistent bar at the bottom of the viewport. It should be Pure White with a subtle 1px border. No heavy shadow. Use the Accent color only for the "Submit" icon or cursor.
- **Memory Cards:** Minimalist containers for retrieved info. Use `body-md` for content and `label-sm` for timestamps. Borders are #E2E8F0.
- **Source Chips:** Small, inline elements that link back to the original email or document. Use a light gray background (#F1F5F9) with a small 12px icon and `label-md` text.
- **Buttons:** Primary buttons are Solid Primary (#0F172A) with White text. Secondary buttons are outlined. Accent buttons (for critical actions) use Sunset Orange.
- **Sidebar:** A clean, low-contrast list of categories (Recents, Starred, People). Use `label-md` for navigation items with high active-state contrast.
- **Highlighters:** When a keyword is retrieved, it should be wrapped in a subtle Sunset Orange tint (10% opacity) with a bold weight, rather than a solid background.