export const colors = {
  background: '#F4F6F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F0',
  ink: '#111820',
  inkMuted: '#56616D',
  inkSubtle: '#77818C',
  border: '#D7DED9',
  brand: '#B3261E',
  brandDark: '#7E1713',
  success: '#197A4A',
  warning: '#8A5A00',
  blue: '#1F5E8C',
};

export const lineColors: Record<string, { background: string; foreground: string }> = {
  RD: { background: '#C62828', foreground: '#FFFFFF' },
  OR: { background: '#F28C28', foreground: '#111820' },
  SV: { background: '#A7A9AC', foreground: '#111820' },
  BL: { background: '#1D62A8', foreground: '#FFFFFF' },
  YL: { background: '#F6D04D', foreground: '#111820' },
  GR: { background: '#228B4E', foreground: '#FFFFFF' },
};

export const shadow = {
  shadowColor: '#111820',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 24,
  elevation: 3,
};

export const fonts = {
  medium: {
    fontFamily: 'Helvetica Neue',
    fontWeight: '500' as const,
  },
  bold: {
    fontFamily: 'Helvetica Neue',
    fontWeight: '700' as const,
  },
};
