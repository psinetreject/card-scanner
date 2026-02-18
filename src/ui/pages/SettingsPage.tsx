export function SettingsPage() {
  return (
    <section>
      <h2>Settings</h2>
      <div className="panel">
        <p>Camera controls are browser/device dependent:</p>
        <ul>
          <li>Torch/zoom/exposure are not guaranteed by MediaDevices in all browsers.</li>
          <li>iOS Safari has stricter camera and file limitations.</li>
          <li>Low-end devices may need lower camera resolution for OCR speed.</li>
        </ul>
      </div>
      <div className="panel">
        <p>Future native Android path: CameraX + ML Kit + Room/SQLite while reusing TypeScript matching core logic and sync contracts.</p>
      </div>
    </section>
  );
}
