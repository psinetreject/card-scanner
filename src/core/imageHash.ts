function hexToBigInt(hex: string): bigint {
  return BigInt(`0x${hex}`);
}

export function hammingHex(a: string, b: string): number {
  let x = hexToBigInt(a) ^ hexToBigInt(b);
  let c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}

export async function computeAverageHash(canvas: HTMLCanvasElement, size = 8): Promise<string> {
  const temp = document.createElement('canvas');
  temp.width = size;
  temp.height = size;
  const ctx = temp.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.drawImage(canvas, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
  let bits = '';
  for (const v of gray) bits += v >= avg ? '1' : '0';
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

export async function extractVisualCrops(source: HTMLCanvasElement): Promise<{ full: HTMLCanvasElement; art: HTMLCanvasElement }> {
  const full = document.createElement('canvas');
  full.width = 320;
  full.height = 466;
  const fctx = full.getContext('2d');
  if (!fctx) throw new Error('2D context unavailable');
  fctx.drawImage(source, 0, 0, full.width, full.height);

  const art = document.createElement('canvas');
  art.width = 256;
  art.height = 192;
  const actx = art.getContext('2d');
  if (!actx) throw new Error('2D context unavailable');
  const sx = Math.floor(full.width * 0.1);
  const sy = Math.floor(full.height * 0.23);
  const sw = Math.floor(full.width * 0.8);
  const sh = Math.floor(full.height * 0.42);
  actx.drawImage(full, sx, sy, sw, sh, 0, 0, art.width, art.height);
  return { full, art };
}
