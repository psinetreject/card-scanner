import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function resolveHttpsOption() {
  const keyPath = path.resolve('certs', 'dev-key.pem');
  const certPath = path.resolve('certs', 'dev-cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      minVersion: 'TLSv1.2' as const,
    };
  }

  return {
    minVersion: 'TLSv1.2' as const,
  };
}

export default defineConfig(async () => {
  const plugins = [react()];

  try {
    const mkcert = (await import('vite-plugin-mkcert')).default;
    plugins.push(mkcert());
  } catch {
    console.warn('[vite] vite-plugin-mkcert not installed; using HTTPS with provided local certs or Vite fallback cert.');
  }

  return {
    plugins,
    server: {
      host: true,
      port: 5173,
      https: resolveHttpsOption(),
    },
  };
});
