import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const coverageConfig = {
  provider: 'v8' as const,
  include: [
    'src/db/**/*.ts',
    'src/main/services/**/*.ts',
    'src/renderer/src/**/*.{ts,tsx}',
    'src/shared/**/*.ts'
  ],
  exclude: [
    'src/**/__tests__/**',
    'src/**/test/**',
    'src/renderer/src/components/ui/**',
    'src/renderer/src/components/Versions.tsx',
    'src/renderer/src/env.d.ts',
    'src/renderer/src/main.tsx',
    'src/renderer/src/types/**',
    'src/main/index.ts',
    'src/main/services/WindowManagerService.ts',
    'src/preload/**',
    'src/db/client.ts',
    'src/db/index.ts',
    'src/db/migrate.ts'
  ],
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  }
}

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    css: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: coverageConfig,
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/db/**/*.test.ts', 'src/main/**/*.test.ts'],
          setupFiles: ['./src/test/setup.ts'],
          globals: true
        }
      },
      {
        plugins: [react()],
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/renderer/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
          globals: true,
          css: true
        },
        resolve: {
          alias: {
            '@': '/src/renderer/src'
          }
        }
      }
    ]
  },
  resolve: {
    alias: {
      '@': '/src/renderer/src'
    }
  }
})
