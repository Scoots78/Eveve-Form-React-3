import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/testform25/', // 👈 important for subdirectory deployment
  plugins: [react()],
});