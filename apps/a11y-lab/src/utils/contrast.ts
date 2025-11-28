type PaletteColor = {
  name: string;
  foreground: string;
  background: string;
};

type ContrastResult = PaletteColor & { ratio: number; pass: boolean };

export function evaluateContrastBudget(palette: PaletteColor[], minimumRatio: number): ContrastResult[] {
  return palette.map((color) => {
    const ratio = contrastRatio(color.foreground, color.background);
    return { ...color, ratio, pass: ratio >= minimumRatio };
  });
}

export function contrastRatio(foreground: string, background: string): number {
  const lumA = luminance(hexToRgb(foreground));
  const lumB = luminance(hexToRgb(background));
  const brighter = Math.max(lumA, lumB) + 0.05;
  const darker = Math.min(lumA, lumB) + 0.05;
  return brighter / darker;
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const rgb = [r, g, b].map((component) => {
    const channel = component / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    throw new Error(`Expected 6 digit hex color, received ${hex}`);
  }
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return { r, g, b };
}
