import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Em desenvolvimento, tudo que começa com /api vai para a API do Caravana.
    // Assim o navegador acha que front e API estão no mesmo endereço,
    // e o cookie do refresh token funciona sem complicação.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
