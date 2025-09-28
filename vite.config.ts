import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: {
    sourcemap: true
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'src/assets', dest: 'src' },
        { src: 'src/config', dest: 'src' }
      ]
    })
  ]
})
