import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig({
  // Set base to repo name for GitHub Pages
  // Change 'word-scramble' to your actual GitHub repository name
  base: process.env.NODE_ENV === 'production' ? '/word-scramble/' : '/',
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar()
  ],
})
