import { useEffect, useRef, useState } from 'react';
import type { ICameraService } from '../../services/interfaces';

type Props = {
  camera: ICameraService;
  onCapture: (blob: Blob) => void;
};

export function CameraPreview({ camera, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [hint, setHint] = useState('Align card inside guide. Use good lighting.');

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!videoRef.current) return;
      try {
        await camera.start(videoRef.current, selected || undefined);
        const cams = await camera.listDevices();
        if (active) setDevices(cams);
      } catch {
        setHint('Camera unavailable. Check permissions/browser support.');
      }
    };
    init();
    return () => {
      active = false;
      camera.stop();
    };
  }, [camera, selected]);

  const capture = async () => {
    if (!videoRef.current) return;
    const blob = await camera.capture(videoRef.current);
    onCapture(blob);
  };

  return (
    <div className="panel">
      <div className="camera-frame">
        <video ref={videoRef} muted playsInline />
        <div className="guide" />
      </div>
      <div className="grid cols-2" style={{ marginTop: '.6rem' }}>
        <div>
          <label>Camera</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Default (rear preferred)</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 4)}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Controls</label>
          <small className="muted">Torch/zoom/exposure vary by browser/hardware; gracefully disabled in MVP.</small>
        </div>
      </div>
      <p><small className="muted">{hint}</small></p>
      <button onClick={capture}>Scan card</button>
    </div>
  );
}
