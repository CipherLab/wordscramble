import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  // Set base to repo name for GitHub Pages
  // Change 'wordscramble' to your actual GitHub repository name
  base: process.env.NODE_ENV === 'production' ? '/wordscramble/' : '/',
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar()
  ],
  server: {
    proxy: {
      // Proxy n8n webhook requests to avoid CORS issues during development
      '/api/n8n': {
        target: 'http://192.168.2.36:5678',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
      },
    },
  },
})
