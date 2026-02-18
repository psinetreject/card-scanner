import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraPreview } from '../components/CameraPreview';
import { preprocessImage } from '../../core/preprocess';
import { useServices } from '../hooks/useServices';

export function ScanPage() {
  const services = useServices();
  const navigate = useNavigate();
  const [autoScan, setAutoScan] = useState(false);
  const [status, setStatus] = useState('Ready.');

  const onCapture = async (blob: Blob) => {
    setStatus('Preprocessing + OCR...');
    await services.storage.init();
    const processed = await preprocessImage(blob, { grayscale: true, contrastBoost: 90 });
    const processedBlob = await new Promise<Blob>((resolve) => processed.toBlob((x) => resolve(x!), 'image/jpeg', 0.9));
    const ocr = await services.ocr.extract(processedBlob);
    const match = await services.matcher.run({ extractedName: ocr.name, extractedSetCode: ocr.setCode });

    navigate('/result', {
      state: {
        ocr,
        match,
        thumb: processed.toDataURL('image/jpeg', 0.6),
      },
    });
  };

  return (
    <section>
      <h2>Scan</h2>
      <p className="panel">Live camera + local OCR + local cache matching (offline-first).</p>
      <div className="panel">
        <label>
          <input type="checkbox" checked={autoScan} onChange={(e) => setAutoScan(e.target.checked)} /> Auto-scan (MVP placeholder)
        </label>
        <p><small className="muted">Status: {status}. Focus + brightness hints appear in camera panel.</small></p>
      </div>
      <CameraPreview camera={services.camera} onCapture={onCapture} />
    </section>
  );
}
