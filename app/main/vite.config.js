import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
    resolve: {
        alias: {
            '@app': path.resolve(import.meta.dirname, '../'),
        },
    },
    build: {
        ssr: true,
        target: 'node23',
        outDir: 'dist',
        assetsDir: '.',
        lib: {
            entry: 'src/index.ts',
            formats: ['es'],
        },
        emptyOutDir: true,
    },
})
