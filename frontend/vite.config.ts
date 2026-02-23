import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Load faster
          if (id.includes('@iota')) {
            return 'iota-sdk';
          }
          if (id.includes('react-globe.gl') || id.includes('three')) {
            return 'globe-visuals';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});