import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Hent evt. .env variabler
  const env = loadEnv(mode, process.cwd(), '')
  // Standard target kan ændres i .env
  const target = env.VITE_PROXY_TARGET || 'https://telegiganten.dk'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Alt under /wp-json sendes videre til WP
        '/wp-json': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
