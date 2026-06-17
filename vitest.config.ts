import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/src/__tests__/**/*.test.ts',
      'src/**/*.test.ts',
      'tests/**/*.test.ts'
    ],
    environmentMatchGlobs: [
      // 工程结构/产物/build 验证类测试需要 Node API
      ['tests/**/*.test.ts', 'node'],
      ['packages/schema/**/*.test.ts', 'node']
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@pageforge/schema': resolve(__dirname, 'packages/schema/src/index.ts'),
      '@electron': resolve(__dirname, 'electron')
    }
  }
})
