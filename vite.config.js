import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Updated for production deployment
  base: '/form1-0-0/', // 👈 important for subdirectory deployment
  plugins: [react()],
});