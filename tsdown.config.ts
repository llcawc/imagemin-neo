import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: {
    esm: {
      fixedExtension: false,
      target: ['node20'],
    },
    // cjs: {
    //   target: ['node20'],
    // },
  },
  dts: {
    tsgo: true,
  },
  exports: true,
})
