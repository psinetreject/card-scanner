export type PreprocessOptions = {
  grayscale?: boolean;
  contrastBoost?: number;
  sharpen?: boolean;
};

export async function preprocessImage(blob: Blob, options: PreprocessOptions = {}): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = data.data;

  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];

    if (options.grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray;
      g = gray;
      b = gray;
    }

    if (options.contrastBoost) {
      const factor = (259 * (options.contrastBoost + 255)) / (255 * (259 - options.contrastBoost));
      r = factor * (r - 128) + 128;
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;
    }

    pixels[i] = clamp(r);
    pixels[i + 1] = clamp(g);
    pixels[i + 2] = clamp(b);
  }

  ctx.putImageData(data, 0, 0);
  return canvas;
}

const clamp = (x: number) => Math.max(0, Math.min(255, x));
