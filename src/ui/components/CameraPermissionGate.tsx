import { useMemo, useState } from 'react';
import type { ICameraService } from '../../services/interfaces';
import { CameraPreview } from './CameraPreview';

type PermissionState = 'not_requested' | 'requesting' | 'granted' | 'denied';

type Props = {
  camera: ICameraService;
  onCapture: (blob: Blob) => void;
};

const isSecureEnough =
  window.isSecureContext ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

function explainError(error: unknown): string {
  if (!(error instanceof DOMException)) return 'Unable to access camera.';
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Please allow camera access and try again.';
  }
  if (error.name === 'NotFoundError') {
    return 'No camera device was found on this device.';
  }
  if (error.name === 'NotReadableError') {
    return 'Camera is busy or already in use by another app/tab.';
  }
  if (error.name === 'SecurityError') {
    return 'Camera access is blocked in this browser/security context.';
  }
  return `Camera error: ${error.name}`;
}

export function CameraPermissionGate({ camera, onCapture }: Props) {
  const [state, setState] = useState<PermissionState>('not_requested');
  const [errorMsg, setErrorMsg] = useState('');

  const unsupported = useMemo(() => !navigator.mediaDevices?.getUserMedia, []);

  const enableCamera = async () => {
    if (unsupported) {
      setState('denied');
      setErrorMsg('This browser does not support camera access (getUserMedia unsupported).');
      return;
    }

    setState('requesting');
    setErrorMsg('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      stream.getTracks().forEach((t) => t.stop());
      setState('granted');
    } catch (error) {
      setState('denied');
      setErrorMsg(explainError(error));
    }
  };

  if (state === 'granted') {
    return <CameraPreview camera={camera} onCapture={onCapture} enabled onStop={() => setState('not_requested')} />;
  }

  return (
    <div className="panel">
      <h3>Camera Access</h3>
      {!isSecureEnough && (
        <p className="status-warn">
          Camera may fail on mobile browsers over non-HTTPS connections. Use localhost or HTTPS LAN setup (see README LAN/HTTPS section).
        </p>
      )}

      {state === 'not_requested' && (
        <>
          <p>To scan cards, please enable camera access.</p>
          <button onClick={enableCamera}>Enable Camera</button>
        </>
      )}

      {state === 'requesting' && (
        <>
          <p>Requesting camera permission…</p>
          <button disabled>Requesting…</button>
        </>
      )}

      {state === 'denied' && (
        <>
          <p className="status-warn">{errorMsg}</p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button onClick={enableCamera}>Try again</button>
          </div>
          <details style={{ marginTop: '.6rem' }}>
            <summary>How to enable camera permissions</summary>
            <ul>
              <li>Click the lock/camera icon in the browser address bar and allow Camera.</li>
              <li>Close other apps/tabs that might be using the camera.</li>
              <li>If using phone over LAN, try HTTPS dev mode for stricter browsers.</li>
              <li>Reload the page after granting permission.</li>
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
