// The palette offered by the category colour picker (Phase 11). Any valid
// #rrggbb hex is accepted by the backend; these are the curated presets the UI
// shows. Chosen to stay distinct from the invoice-status colours and to read on
// both the light and dark neutral themes.
export const CATEGORY_COLORS = [
  '#16a34a', // green
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b', // slate
] as const;

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0];
