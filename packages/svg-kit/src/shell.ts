import { escapeXml } from './base.js';

export interface SvgShellOptions {
  width: number;
  height: number;
  rootId?: string;
  title: string;
  desc?: string;
  children: string;
}

export function svgShell({ width, height, rootId, title, desc, children }: SvgShellOptions): string {
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">\n  <title>${escapeXml(title)}</title>`;
  if (desc !== undefined) {
    out += `\n  <desc>${escapeXml(desc)}</desc>`;
  }
  if (rootId !== undefined) {
    out += `\n  <g id="${rootId}">`;
  }
  out += `\n${children}`;
  if (rootId !== undefined) {
    out += `\n  </g>`;
  }
  out += `\n</svg>`;
  return out;
}