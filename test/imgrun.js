import jpegtran from 'imagemin-jpegtran'
import svgo from 'imagemin-svgo'

import imagemin from '../dist/index.js'

const files = await imagemin(['test/*.{jpg,svg}', '!test/fixture-corrupt.jpg'], {
  destination: 'test/images',
  plugins: [jpegtran(), svgo()],
})

console.log(files)
//=> [{ data: Uint8Array(46987) [255, 216, 255, ... 46887 more items ], sourcePath: 'C:\\www\\blueprints\\imagemin-neo\\test\\fixture.jpg', destinationPath: 'test\\out\\fixture.jpg'}, …]
