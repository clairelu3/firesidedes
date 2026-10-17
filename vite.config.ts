import { networkInterfaces } from 'node:os'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `npm run dev:phone` → HTTPS on your Wi-Fi IP, so a phone can scan the QR and use the mic.
const https = process.env.HTTPS === '1'

// Laptop's Wi-Fi IP, so QR codes generated on localhost point somewhere a phone can reach.
const lanIp =
  Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address ?? null

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(https ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 5173,
    // Allow Cloudflare tunnel URLs (real HTTPS for phones): cloudflared tunnel --url http://localhost:5174
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  define: {
    __LAN_IP__: JSON.stringify(lanIp),
  },
})
