import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5181,
    watch: {
      // server/ is the Express backend — Vite watches the whole project tree
      // by default, so every write to its runtime files (uploaded photos,
      // custom-products.json, the .env secret) was triggering an HMR full
      // page reload in the middle of using the app (e.g. losing all React
      // state right after submitting the "Add Product" form, since the
      // backend writes custom-products.json as part of handling that request).
      ignored: ['**/server/**'],
    },
  },
})
