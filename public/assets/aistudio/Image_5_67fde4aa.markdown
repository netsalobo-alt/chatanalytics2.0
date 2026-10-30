---
name: Executive Revenue Intelligence
colors:
  surface: '#f8f9fc'
  surface-dim: '#d9dadd'
  surface-bright: '#f8f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3f7'
  surface-container: '#edeef1'
  surface-container-high: '#e7e8eb'
  surface-container-highest: '#e1e2e6'
  on-surface: '#191c1e'
  on-surface-variant: '#42474e'
  inverse-surface: '#2e3133'
  inverse-on-surface: '#eff1f4'
  outline: '#72777f'
  outline-variant: '#c2c7cf'
  surface-tint: '#386287'
  primary: '#002139'
  on-primary: '#ffffff'
  primary-container: '#00375a'
  on-primary-container: '#78a1c9'
  inverse-primary: '#a2caf5'
  secondary: '#486800'
  on-secondary: '#ffffff'
  secondary-container: '#c1ef6d'
  on-secondary-container: '#4c6c00'
  tertiary: '#002232'
  on-tertiary: '#ffffff'
  tertiary-container: '#00394f'
  on-tertiary-container: '#3ba7d9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cee5ff'
  primary-fixed-dim: '#a2caf5'
  on-primary-fixed: '#001d33'
  on-primary-fixed-variant: '#1d4a6e'
  secondary-fixed: '#c4f270'
  secondary-fixed-dim: '#a9d557'
  on-secondary-fixed: '#131f00'
  on-secondary-fixed-variant: '#364e00'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#f8f9fc'
  on-background: '#191c1e'
  surface-variant: '#e1e2e6'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-stat:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

The design system embodies a modern, enterprise-grade business intelligence and conversational analytics ethos. Tailored for growth leaders, media buyers, and sales operations executives, the interface communicates technical rigor, reliability, and actionable clarity. 

The aesthetic blends **Modern Corporate** structure with **Precision Analytics Density**:
- **Clarity over Clutter:** White surfaces, generous data breathing room, and structured information hierarchy ensure high-density metrics (conversions, CAC, ROAS, pipeline velocity) remain scannable.
- **Deep Immersion Sidebar:** A deep institutional navy navigation spine anchors the workspace, offering an anchor of stability and authority while allowing the primary analytical canvas to remain light, crisp, and distraction-free.
- **Precision Data Accents:** Energetic institutional greens and specialized cyan tones are reserved strictly for positive telemetry, conversions, trends, and active workflow states.

## Colors

The palette establishes an authoritative, enterprise analytics environment balanced by functional telemetry colors:

- **Primary (`#00375A`)**: Institutional Deep Blue. Used for major structural elements, primary buttons, high-contrast headings, and foundational interactive states.
- **Secondary (`#87B137`)**: Institutional Growth Green. Reserved for high-value metrics, conversion gains, positive trend lines, victory indicators, and primary checkout/lead-confirmation tags.
- **Tertiary (`#1A94C5`)**: Cyan Blue. Applied to funnel progression stages, Chatwoot sync status, telemetry graphs, and secondary analytical highlights.
- **Navy Depth (`#002946` / `#00386E`)**: Dedicated sidebar surface, command menus, and dark surface overlays.
- **Neutral Spectrum**:
  - `Canvas / Background`: Multi-tiered neutral structure using `#F8FAFC` (main viewport background) and `#F1F5F9` (recessed tables and filter zones).
  - `Borders & Rules`: `#E2E8F0` and `#E6E7E8` provide non-intrusive structural grids.
  - `Muted Text & Metadata`: `#939598` and `#64748B` provide high-contrast compliance for sublabels, axis values, and timestamp details without visual noise.

## Typography

Typography relies entirely on **Inter** to ensure maximum legibility at granular scales across data tables, complex KPI cards, and continuous conversation threads.

- **Tabular Numerals**: Numerical figures in tables, conversion rates, and dashboard cards must enforce OpenType tabular figures (`font-feature-settings: "tnum"`) to maintain clean vertical alignments across rapid data refreshes.
- **Vertical Rhythm**: Headers use tight negative letter-spacing (`-0.015em` to `-0.025em`) to produce a polished editorial appearance in KPI titles and module headings.
- **Metadata Hierarchy**: Analytical labels, chart axes, and column headers leverage `label-sm` with slight uppercase tracking (`0.04em`) to differentiate context from live data values.

## Layout & Spacing

The layout is built around a persistent, fixed-width navigational shell paired with a flexible, high-density 12-column analytical canvas.

- **Shell Architecture**:
  - Desktop: Collapsible dark sidebar fixed at `260px` (contracting to `72px` icon rail on command) alongside a fluid multi-panel workspace.
  - Breakpoints: Desktop (`1280px+`), Laptop (`1024px - 1279px`), Tablet (`768px - 1023px`), and Mobile (`< 768px`).
- **Dashboard Grid Rules**:
  - Primary analytics views run a 12-column grid with dynamic card spans: 3-column spans for high-level KPI cards, 6-column spans for attribution graphs, and full 12-column spans for Chatwoot lead-conversion funnels and audit logs.
- **Rhythm & Safe Areas**:
  - Inner card padding strictly follows `space-lg` (`1.5rem` / `24px`) to preserve white space inside metrics widgets.
  - Component stacks (e.g., filter toolbars, metric headers) use `space-sm` (`8px`) and `space-md` (`16px`) gaps to emphasize component relationships.

## Elevation & Depth

Visual hierarchy pairs clean planar surfaces with targeted micro-shadows to ensure high-density analytical dashboards remain readable and calm:

- **Surface Layers**:
  - *Base Surface*: `#F8FAFC` provides the neutral floor for the entire dashboard canvas.
  - *Card Surface*: Pristine `#FFFFFF` with ultra-subtle perimeter borders (`1px solid #E2E8F0`).
  - *Structural Dark Spine*: `#002946` to `#00375A` solid fill with inset vertical dividers (`1px solid rgba(255, 255, 255, 0.08)`).
- **Elevation System**:
  - **Flat / Base**: Standard metric containers and tables use zero shadow and rely entirely on `1px solid #E2E8F0`.
  - **Elevated (Hover & Active Cards)**: `box-shadow: 0 4px 12px -2px rgba(0, 41, 70, 0.06), 0 2px 6px -1px rgba(0, 41, 70, 0.03)`. Hover transitions use a 150ms ease to signal interactivity without feeling floaty.
  - **Dropdowns & Popovers**: `box-shadow: 0 10px 25px -5px rgba(0, 41, 70, 0.12), 0 8px 10px -6px rgba(0, 41, 70, 0.08)`.
  - **Modals & Slide-over Drawers (Chatwoot Lead Details)**: `box-shadow: 0 20px 35px -10px rgba(0, 41, 70, 0.22)`.

## Shapes

The interface balances sharp enterprise efficiency with modern rounded aesthetics:

- **Dashboard Cards & Large Containers**: Formed with `rounded-xl` (`1.5rem` / `24px` outer radius) for clean visual bounding of distinct metric domains.
- **Interactive Controls (Inputs, Buttons, Dropdowns)**: Standardized to `rounded-md` (`0.5rem` / `8px`) to ensure operational clarity and space-efficient form layouts.
- **Badges, Tags, and Status Pills**: Fully rounded pill shapes (`9999px`) provide contrast against rectangular analytical cards and tabular data.

## Components

### Buttons
- **Primary**: Solid Institutional Blue (`#00375A`) with pure white text, transitioning to `#002946` on hover. Padding: `10px 18px`. Radius: `8px`. Font: `label-md`.
- **Success / Conversion CTA**: Solid `#87B137` background, white text, 1px hover lift. Reserved for direct attribution actions (e.g., "Export Leads", "Sync Chatwoot Pipeline").
- **Secondary / Outline**: `#FFFFFF` background, `1px solid #E2E8F0`, `#00375A` text. Hover background shifts to `#F1F5F9`.
- **Ghost**: Transparent background, `#64748B` text, shifting to `#00375A` with background `#F8FAFC` on hover.

### Navigation Sidebar (Dark Spine)
- **Container**: Solid `#002946` background with an internal `#00386E` gradient wash at the top.
- **Nav Items**: Height `44px`, horizontal padding `16px`, corner radius `8px`. Inactive text in `#939598` with hover state shifting to white and background `rgba(255, 255, 255, 0.06)`.
- **Active Nav Item**: Solid `#00375A` background with crisp white typography and a `3px` left accent bar in `#87B137` or `#1A94C5`.
- **Badges within Sidebar**: Compact pill styling with background `rgba(135, 177, 55, 0.15)` and text `#D9E697`.

### KPI & Analytics Cards
- **Structure**: `#FFFFFF` background, `1px solid #E2E8F0`, rounded with `rounded-xl` (`24px`). Padding: `24px`.
- **Header**: Metric label in `label-sm` uppercase (`#64748B`), paired with an optional icon slot or help tooltip.
- **Value**: High-impact numerical stat using `metric-stat` (`28px` bold) in `#00375A`.
- **Trend Pill**: Inline badge featuring an arrow indicator. Positive trends use background `#F0FDF4` with `#87B137` text; negative trends use `#FEF2F2` with `#DC2626` text.

### Form Inputs & Filters
- **Text Inputs & Dropdowns**: Background `#FFFFFF`, border `1px solid #CBD5E1`, text `#002946`, height `40px`, radius `8px`.
- **Focus State**: Border color transitions to `#1A94C5` with a subtle focus ring `0 0 0 3px rgba(26, 148, 197, 0.15)`.
- **Date Range Picker**: Segmented pill group with soft gray dividers and highlighted active ranges in `#00375A`.

### Status Badges & Chips
- **Attribution / Channel Badges**: (Google Ads, Meta Ads, Organic, Chatwoot direct) Subtle pastel background tints with matching deep text (e.g., `#E0F2FE` background with `#0369A1` text).
- **Lead Stage Pills**: Multi-stage indicator tracking qualification stages using `#1BB4B0`, `#1A94C5`, and closed-won status in `#87B137`.

### Data Tables
- **Header**: Height `44px`, background `#F8FAFC`, bottom border `1px solid #E2E8F0`, uppercase `label-sm` text in `#64748B`.
- **Rows**: Alternating hover effect (`#F8FAFC`), row height `52px`, bottom divider `1px solid #F1F5F9`. Numeric columns right-aligned with tabular font formatting.