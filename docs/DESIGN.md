# DESIGN.md — UI System

## Direction
"Premium fitness club": dark, luxury, athletic, professional, high-contrast, strong typography,
clean data visualization, subtle glass effects sparingly, premium card treatments. Avoid heavy
neon, excessive gradients, glassmorphism overload, or large decorative animation.

## Color System (example tokens — tune during implementation)
- `--bg-base`: near-black charcoal (e.g. `#0B0C0E`)
- `--surface-card`: elevated dark surface with subtle border, not pure black
- `--accent-primary`: a disciplined athletic accent (e.g. deep amber or electric blue) used
  sparingly for primary actions and key numbers only
- Status colors, used consistently everywhere (table rows, badges, KPI cards, notification
  center):
  - 🟢 Active — success green
  - 🟡 Expiring Soon — amber
  - 🔴 Expired — red
  - ⚪ Cancelled — neutral gray
  - 🔵 Paused — blue

## Typography
- One strong display/heading family for KPI numbers and page titles.
- One highly legible body family for tables and forms.
- Numeric data (dates, currency, day counts) should use tabular figures so columns align.

## Layout Principles
- Dashboard leads with "who needs attention," not a wall of charts.
- Tables collapse into card/list views on mobile — never a horizontally-shrunk table.
- Forms (member creation, renewal, payment) are multi-step or clearly sectioned, not one long
  scroll of unlabeled fields.

## Motion
- Motion communicates state changes only: card entrance on dashboard load, notification
  appearance, modal open/close, button loading spinners, status color transitions, table
  filter transitions.
- No large or gratuitous animation.
- Respect `prefers-reduced-motion` everywhere motion is used.

## Key Screens
1. **Dashboard** — KPI cards, "Today's Attention," upcoming expirations table.
2. **Member Table** — search + filters (status, expiry window), sortable columns.
3. **Member Profile** — profile, current membership, payment summary, full membership history,
   notification history, activity timeline.
4. **Renewal Modal** — current plan/expiry, plan picker, discount, computed new dates, payment
   capture.
5. **Payment/Receipt** — payment form, receipt preview, print/download.
6. **Notification Center** — URGENT / WARNING / INFO sections, mark-as-read, jump-to-entity.
7. **Reports** — filterable charts + CSV export.

## Accessibility
- Sufficient contrast against the dark base (WCAG AA minimum for text).
- All status indicators carry a text/icon label, not color alone.
- Keyboard-navigable tables, modals with focus trapping, visible focus states.
