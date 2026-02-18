import type { ICameraService } from './interfaces';

export class WebCameraService implements ICameraService {
  private stream?: MediaStream;

  async start(video: HTMLVideoElement, deviceId?: string): Promise<void> {
    this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: deviceId ? undefined : { ideal: 'environment' },
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    video.srcObject = this.stream;
    await video.play();
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
  }

  async capture(video: HTMLVideoElement): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to capture frame');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Capture failed'))), 'image/jpeg', 0.92);
    });
  }

  async listDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput');
  }

  isTorchSupported(): boolean {
    return false;
  }
}
