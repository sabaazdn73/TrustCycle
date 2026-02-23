import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 3000, 
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('globe') || id.includes('react-globe')) {
              return 'visuals-bundle';
            }
            if (id.includes('@iota')) {
              return 'iota-sdk';
            }
          }
        },
      },
    },
  },
});