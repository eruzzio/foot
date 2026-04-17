import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function safeCopyPublicPlugin() {
  return {
    name: 'safe-copy-public',
    apply: 'build' as const,
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const distDir = path.resolve(__dirname, 'dist');

      if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

      let files: string[] = [];
      try {
        files = fs.readdirSync(publicDir);
      } catch {
        return;
      }

      for (const file of files) {
        const src = path.join(publicDir, file);
        const dest = path.join(distDir, file);
        try {
          fs.copyFileSync(src, dest);
        } catch {
          // skip locked files silently
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), safeCopyPublicPlugin()],
  publicDir: false,
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
