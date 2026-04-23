import jpegtran from 'imagemin-jpegtran'
import svgo from 'imagemin-svgo'
import { glob } from 'tinyglobby'

import imagemin from '../dist/index.js'

const files = await glob(['test/*.{jpg,svg}', '!test/fixture-corrupt.jpg'])
const results = await imagemin(files, {
  destination: 'test/images',
  plugins: [jpegtran({ quality: 90 }), svgo({ plugins: [{ name: 'preset-default' }, 'removeViewBox'] })],
  glob: false,
})
console.log(`Optimized ${results.length} images`)
