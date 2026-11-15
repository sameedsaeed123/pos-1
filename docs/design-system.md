# Design System Specification: Pakistani Retail POS

This design system is tailored for fast, high-volume retail checkout in Pakistani kiryana stores, mini-marts, and general stores. It is optimized for all-day cashier ergonomics, rapid barcode processing, low-literacy touch targets, and full bilingual English and Urdu RTL ergonomics.

---

## 1. Design Direction and Visual Language
*   **Foundation**: Commerce-native, high-contrast operational interface inspired by Shopify Polaris and modern supermarket terminals.
*   **Aesthetic Principle**: Zero decorative fluff. No purple gradients, no blurry card shadows, no floating blobs, and no emoji icons. Every millimeter serves checkout speed and error prevention.
*   **Visibility Threshold**: Main bill totals and change calculations must be readable from 1 metre away under bright shop lights.
*   **Application Shell**: Designed to run as an installed Progressive Web App (PWA) or in dedicated browser kiosk mode (`--kiosk`). The app explicitly captures keyboard shortcuts and prevents browser default actions.

---

## 2. Color Palette and Semantic Tokens

All text-on-background combinations meet or exceed WCAG AA 4.5:1 contrast for normal text.

### Light Mode Palette

| Token Name | Hex Code | Contrast on Light (#F8FAFC / #FFFFFF) | Purpose & Application |
| :--- | :--- | :--- | :--- |
| `color-bg-base` | `#F8FAFC` | 1.05:1 vs white | Main application canvas |
| `color-surface` | `#FFFFFF` | N/A | Register cards, modals, table rows |
| `color-border` | `#E2E8F0` | 1.3:1 | Structural dividers, grid borders |
| `color-text-primary` | `#0F172A` | 15.6:1 (Passes AAA) | Primary product titles, prices, customer names |
| `color-text-secondary` | `#475569` | 7.3:1 (Passes AAA) | SKU codes, unit descriptions, metadata |
| `color-primary-green` | `#15803D` | 4.6:1 with white text | Unified primary action and success badges (Paid, In Stock) |
| `color-primary-hover` | `#166534` | 6.2:1 with white text | Hover and active button states |
| `color-danger` | `#DC2626` | 4.6:1 with white text | Void item, cancelled bill, delete, out-of-stock alert |
| `color-warning` | `#C2410C` | 4.7:1 with white text | Low inventory alert, approaching expiry date |
| `color-khata-indigo` | `#4338CA` | 6.3:1 with white text | Customer Udhaar balance, credit ledger tags (distinct from warning) |
| `color-scan-pulse` | `#15803D` | N/A | Row highlight pulse on successful barcode scan |
| `color-scan-error` | `#DC2626` | N/A | Row highlight pulse and shake on scan error |

### Dark Mode Palette

| Token Name | Hex Code | Text Pairing & Contrast | Purpose & Application |
| :--- | :--- | :--- | :--- |
| `color-dark-bg` | `#090D16` | N/A | Deep low-fatigue night canvas |
| `color-dark-surface` | `#131B2E` | N/A | Card surfaces, modal containers |
| `color-dark-border` | `#1E293B` | N/A | Dark dividers and input outlines |
| `color-dark-text-primary` | `#F8FAFC` | 14.8:1 on #131B2E | Main text and headings |
| `color-dark-text-secondary` | `#94A3B8` | 7.1:1 on #131B2E | Secondary labels and helper text |
| `color-dark-primary-badge` | `#22C55E` | 8.5:1 with text #052E16 | Success and completed sale badges |
| `color-dark-warning-badge` | `#FB923C` | 8.2:1 with text #431407 | Expiry and low stock alerts |
| `color-dark-khata-badge` | `#818CF8` | 7.8:1 with text #1E1B4B | Udhaar debt tags |
| `color-dark-danger-badge` | `#F87171` | 8.4:1 with text #450A0A | Error and void states |

---

## 3. Typography and Numerical Formatting

*   **English Font Family**: **Inter** (`font-sans`). Clean geometric sans-serif with tall x-height.
*   **Urdu Font Family**: **Noto Sans Arabic** (`font-urdu`). Uniform horizontal baseline preventing table row clipping.
*   **Tabular Numerals**: Enforced everywhere via `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`). Prevents jitter during live recalculations.
*   **Western Digits in Urdu**: Even when Urdu language mode is active, all currency values, quantities, weights, phone numbers, and dates strictly use standard Western digits (`0–9`) to prevent digit confusion.
*   **Bidirectional Text Isolation**: Barcodes, SKUs, and phone numbers inside Urdu text are wrapped in `<bdi dir="ltr">` so hyphens, plus signs, and digits never jump sides.
*   **Rupee Display Standard**:
    *   Format: Standard thousand separators (`Rs 1,245,000`).
    *   No Paisa at Till: Drop `.00`. Display whole rupees only at checkout.
    *   Rounding Rule: Standard round-half-up at the bill total level (`Math.round(paisa / 100)`). Paisa is preserved in DB transactions for ledger precision.
*   **Type Scale**:
    *   Grand Total: **52px** (`text-[52px]` / `leading-none`), weight 800 bold tabular numerals. Legible from 1 metre distance.
    *   Subtotals, Change, and Tender: **24px** (`text-2xl`), weight 700.
    *   Item Rows and Prices: **16px** (`text-base`), weight 500.
    *   SKUs and Secondary Info: **14px** (`text-sm`), weight 400.
    *   Keycap Hints: **12px** (`text-xs`), weight 600.

---

## 4. Touch Targets and PKR Tender Buttons

*   **Base Touch Target**: Strict **48px by 48px** minimum for all primary touch controls.
*   **PKR Cash Tender Buttons**: 56px height, high-contrast, one-tap note buttons for the most common kiryana denominations:
    *   `Rs 10`
    *   `Rs 20`
    *   `Rs 50`
    *   `Rs 75` (commemorative note common in circulation)
    *   `Rs 100`
    *   `Rs 500`
    *   `Rs 1,000`
    *   `Rs 5,000`
    *   `Exact Amount`
*   **Corner Radius**: Unified **8px** (`rounded-lg`) on buttons, inputs, and cards.
*   **Quick-Item Tiles**: 120px by 100px. Each tile features a category icon, two-line name (English + Urdu), stock badge, and price. Category is identified by an icon and text label (never color alone).

---

## 5. Keyboard Navigation and Safe Shortcuts

All shortcuts attach to the root window with `event.preventDefault()` and `event.stopPropagation()` to prevent browser interference. The dangerous default browser shortcuts (F5 reload, F12 DevTools) are avoided:

*   `F1`: Product search (blocks browser help, focuses search box)
*   `F2`: Add bill-level discount modal
*   `F3`: Customer Khata search (blocks browser page search)
*   `F4`: Hold / park current bill
*   `F6`: **Recall parked bills list** (moved away from F5 to prevent accidental reload)
*   `F7`: **Print last receipt** (moved away from F12 to prevent DevTools popup)
*   `F8`: Open payment modal
*   `F9`: Quick Cash Tender (exact amount sale)
*   `F10`: Void selected line item (manager PIN required if configured)
*   `ESC`: Dismiss modal, close sheet, or clear active search
*   `UP` / `DOWN`: Navigate item rows in the active cart
*   `+` / `-`: Increment or decrement quantity on the selected line

---

## 6. Feedback, Audio & Error States

*   **Audio Unlocking**: Modern browsers require an initial user gesture. The first tap, click, or keypress on the screen initializes the Web Audio API audio context.
*   **Scan Success Feedback**:
    *   Visual: 150ms emerald green (`#15803D`) border pulse on the added row.
    *   Audio: 880Hz crisp synthetic sine beep (80ms duration).
*   **Scan Error / Unknown Barcode**:
    *   Visual: Red (`#DC2626`) border flash and 300ms horizontal shake animation.
    *   Audio: 220Hz low square-wave double buzz (200ms duration).
*   **Unknown Barcode Handling & Permissions**:
    *   Cashier with Permission: Opens quick-add sheet with the barcode prefilled. Required fields: Name, Sale Price, Category. Pressing Enter saves and carts the product immediately.
    *   Cashier without Permission: The sheet displays a prominent "Enqueue for Manager Approval" button with a disabled direct-save button.
    *   Subsequent Scans: If a cashier scans another item while the unknown barcode sheet is open, the system plays an alert tone, holds the new scan in an input buffer, and prompts: *"Finish or discard the pending item before scanning the next."*

---

## 7. Component Specifications

*   **Button Hierarchy**:
    *   *Primary*: Solid emerald green `#15803D`, hover `#166534`, white text, 48px height, `rounded-lg`, visible focus ring `ring-2 ring-emerald-600 ring-offset-2`.
    *   *Secondary*: Surface white, 1px border `#CBD5E1`, text `#0F172A`, hover `#F1F5F9`.
    *   *Danger*: Solid red `#DC2626`, hover `#B91C1C`, white text.
    *   *Khata*: Solid indigo `#4338CA`, hover `#3730A3`, white text.
*   **Inputs**:
    *   Minimum height 44px, padding `px-3 py-2.5`, border `#CBD5E1`, focus ring `ring-2 ring-emerald-600`.
    *   Numbers in inputs always use `tabular-nums`.
*   **Disabled State**: Opacity 45%, `cursor-not-allowed`, no hover or focus effects.
*   **Empty State**: Centered container with Lucide icon (e.g. `ShoppingCart`, `PackageOpen`), clear heading, and plain instruction (e.g., *"Scan a barcode or press F1 to search items"*).
*   **Loading State**: Smooth pulse skeleton shimmer matching exact row heights to eliminate layout shift.
*   **Manager PIN Dialog**:
    *   Modal with 4-digit masked circles.
    *   Includes on-screen touch number pad (0–9, Clear, Cancel).
    *   On wrong PIN: 300ms shake animation, red outline, and resets digits.
*   **Thermal Receipt Output**:
    *   *80mm Receipt*: 48 text columns (576 dots). Full item table, GST breakdown, FBR QR code.
    *   *58mm Receipt*: 32 text columns (384 dots). Condensed item table, totals, QR code.
    *   *Urdu Printing*: Since most thermal printers lack native Urdu ROM fonts, Urdu receipt headers and item names are rendered onto an off-screen HTML5 canvas and transmitted as ESC/POS monochrome raster bitmap data (`GS v 0`), ensuring crisp Urdu printouts on any hardware.
