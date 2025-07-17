import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/testform-0-2/', // 👈 important for subdirectory deployment
  plugins: [react()],
});