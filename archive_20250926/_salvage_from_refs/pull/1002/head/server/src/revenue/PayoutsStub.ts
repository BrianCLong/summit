export type Share = {
  templateId: string;
  publisher: string;
  grossCents: number;
  epsilonSpent: number;
  sharePct: number;
};

export function calcShare(s: Share) {
  const net = Math.floor((s.grossCents * (s.sharePct / 100)));
  return { ...s, netCents: net };
}
