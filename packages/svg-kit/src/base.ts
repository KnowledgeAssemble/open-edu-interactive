export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function centerOf(b: { x: number; y: number; width: number; height: number }): { cx: number; cy: number } {
  return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
}

export function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    result.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return result;
}

export function polygonPoints(cx: number, cy: number, r: number, sides: number): Array<{ x: number; y: number }> {
  if (sides < 3) return [{ x: cx, y: cy }];
  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    result.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return result;
}