import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraPermissionGate } from '../components/CameraPermissionGate';
import { preprocessImage } from '../../core/preprocess';
import { computeAverageHash, extractVisualCrops } from '../../core/imageHash';
import { useServices } from '../hooks/useServices';

export function ScanPage() {
  const services = useServices();
  const navigate = useNavigate();
  const [autoScan, setAutoScan] = useState(false);
  const [status, setStatus] = useState('Ready.');

  const onCapture = async (blob: Blob) => {
    setStatus('Visual preprocessing + matching...');
    await services.storage.init();
    const processed = await preprocessImage(blob, { grayscale: false, contrastBoost: 60 });
    const crops = await extractVisualCrops(processed);
    const [hashFull, hashArt] = await Promise.all([computeAverageHash(crops.full), computeAverageHash(crops.art)]);

    const processedBlob = await new Promise<Blob>((resolve) => processed.toBlob((x) => resolve(x!), 'image/jpeg', 0.9));
    const ocrPromise: Promise<{ text: string; name?: string; setCode?: string; confidence?: number }> = services.ocr.extract(processedBlob).catch(() => ({ text: '', name: undefined, setCode: undefined, confidence: 0 }));

    const ocr = await ocrPromise;
    const match = await services.matcher.run({ visualHashFull: hashFull, visualHashArt: hashArt, extractedSetCode: ocr.setCode, extractedName: ocr.name });

    navigate(`/results/${crypto.randomUUID()}`, {
      state: {
        ocr,
        match,
        visual: { hashFull, hashArt },
        thumb: processed.toDataURL('image/jpeg', 0.6),
      },
    });
  };

  return (
    <section>
      <h2>Scan</h2>
      <p className="panel">Primary identification is visual matching (pHash), OCR is optional assist.</p>
      <div className="panel">
        <label>
          <input type="checkbox" checked={autoScan} onChange={(e) => setAutoScan(e.target.checked)} /> Auto-scan (MVP placeholder)
        </label>
        <p><small className="muted">Status: {status}. Visual confidence drives ranking; OCR only validates/disambiguates.</small></p>
      </div>
      <CameraPermissionGate camera={services.camera} onCapture={onCapture} />
    </section>
  );
}
