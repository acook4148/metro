export const METRO_LINE_ORDER = ['RD', 'OR', 'SV', 'BL', 'YL', 'GR'];

export const METRO_LINE_NAMES: Record<string, string> = {
  RD: 'Red Line',
  OR: 'Orange Line',
  SV: 'Silver Line',
  BL: 'Blue Line',
  YL: 'Yellow Line',
  GR: 'Green Line',
};

export function normalizeMetroLineCode(code: string | null | undefined): string {
  return code?.trim().toUpperCase() || '--';
}
