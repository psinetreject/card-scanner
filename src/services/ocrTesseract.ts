import { createWorker } from 'tesseract.js';
import type { IOcrService } from './interfaces';

export class TesseractOcrService implements IOcrService {
  async extract(image: Blob): Promise<{ text: string; name?: string; setCode?: string; confidence?: number }> {
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(image);
      const text = data.text ?? '';
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
      const setCodeMatch = text.match(/[A-Z]{2,5}-\d{2,4}/i);
      return {
        text,
        name: lines[0],
        setCode: setCodeMatch?.[0]?.toUpperCase(),
        confidence: data.confidence ? Math.max(0, Math.min(1, data.confidence / 100)) : undefined,
      };
    } finally {
      await worker.terminate();
    }
  }
}
