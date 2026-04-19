// Dark theme palette — matches frontend CSS variables
export const COLORS = {
  // Core backgrounds
  bg: '#0f172a',
  card: '#1e293b',
  surface: '#111820',

  // Text
  text: '#e8f1ff',
  sub: '#9ab0c5',
  textPrimary: '#e8f1ff',
  textSecondary: '#9ab0c5',

  // Accent
  accent: '#02d7ff',
  accentSuccess: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',

  // Borders
  border: '#1e2a35',

  // Status colours
  statusNew: '#6366f1',
  statusActive: '#02d7ff',
  statusDone: '#22c55e',
  statusPaused: '#f59e0b',
  statusCancelled: '#ef4444',
};

// Legacy alias
export const colors = {
  background: COLORS.bg,
  surface: COLORS.card,
  textPrimary: COLORS.text,
  textSecondary: COLORS.sub,
  accent: COLORS.accent,
  accentSuccess: COLORS.accentSuccess,
  border: COLORS.border,
  danger: COLORS.danger,
};

export default COLORS;