/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 用 SPA フォールバックプラグイン
// ビルド時に 404.html を自動生成し、サブパスへの直接アクセス・リロード時にパスを保持してリダイレクトする
function spaFallback(): Plugin {
  let base: string
  return {
    name: 'spa-fallback-404',
    configResolved(config) {
      base = config.base
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<script>
  var b = ${JSON.stringify(base)};
  var p = location.pathname.slice(b.length);
  sessionStorage.setItem('spa-redirect', p + location.search);
  location.replace(b);
</script>`,
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  base: '/d-shift/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
