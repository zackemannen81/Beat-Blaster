import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ command }) => {
  const plugins = []

  if (command === 'build') {
    plugins.push(
      viteStaticCopy({
        hook: 'writeBundle',
        targets: [
          { src: 'src/assets', dest: 'src' },
          { src: 'src/config', dest: 'src' }
        ]
      })
    )
  }

  return {
    base: './',
    server: { port: 5173 },
    build: {
      sourcemap: true
    },
    plugins
  }
})
