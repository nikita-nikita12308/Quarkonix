import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    crx({ manifest }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    // ADD THIS: Allow Chrome Extensions to fetch from localhost
    cors: true,
    origin: 'http://localhost:5173',
    hmr: {
      port: 5173,
    },
  },
})
