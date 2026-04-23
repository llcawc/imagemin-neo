import { readFile, writeFile } from 'node:fs/promises'

import svgo from 'imagemin-svgo'

import imagemin from '../dist/index.js'

const buffer = await readFile('test/fixture.svg')
const optimized = await imagemin.buffer(buffer, {
  plugins: [svgo({ multipass: true })],
})

await writeFile('test/images/icon-optimized.svg', optimized)
