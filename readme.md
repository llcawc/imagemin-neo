# imagemin-neo

[![npm version](https://img.shields.io/npm/v/imagemin-neo?style=flat&logo=npm)](https://www.npmjs.com/package/imagemin-neo)
[![license](https://img.shields.io/npm/l/imagemin-neo?style=flat-square)](https://github.com/llcawc/imagemin-neo/blob/main/license)
[![node version](https://img.shields.io/node/v/imagemin-neo?style=flat&logo=node.js)](https://nodejs.org)
[![Downloads](https://img.shields.io/npm/dm/imagemin-neo.svg?style=flat&logo=npm)](https://www.npmjs.com/package/imagemin-neo)
[![tests](https://img.shields.io/badge/tests-20%20passed-brightgreen?style=flat-square)](https://github.com/llcawc/imagemin-neo/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-✓-007ACC?style=flat-square)](https://www.typescriptlang.org/)

> **Fork notice**: This is a fork of the original [`imagemin`](https://github.com/imagemin/imagemin) package. This fork includes several improvements and modernizations.

> Minify images seamlessly

## ✨ Improvements

This fork brings a number of enhancements over the original `imagemin`:

- **Reduced dependencies** – several external packages replaced with lightweight in‑house implementations
- **Full TypeScript support** – built with TypeScript, includes type definitions out of the box
- **Updated tooling** – uses `oxlint` and `oxfmt` for faster linting/formatting, `vitest` for testing
- **Node.js 20+** – targets current LTS versions
- **Cleaner codebase** – rewritten in TypeScript with explicit types and better documentation

## Install

```sh
npm install imagemin-neo
# or using pnpm
pnpm add imagemin-neo
# or using yarn
yarn add imagemin-neo
```

## Usage

```js
import imagemin from "imagemin-neo";
import jpegtran from "imagemin-jpegtran";
import svgo from "imagemin-svgo";

const files = await imagemin(["src/*.{jpg,svg}"], {
  destination: "build/images",
  plugins: [jpegtran(), svgo()],
});

console.log(files);
//=> [{ data: Uint8Array(46987) [255, 216, ... 46887 more items ], sourcePath: '…/src/beer.jpg', destinationPath: 'build/images/beer.jpg'}, …]
```

## API

### imagemin(input, options?)

Optimizes images from file system. Returns a `Promise<Result[]>` where each `Result` object contains:

```ts
{
  data: Uint8Array; // Optimized image data
  sourcePath: string; // Absolute path to the source file
  destinationPath: string; // Absolute path where the file was saved (or `undefined` if no destination)
}
```

#### input

Type: `readonly string[]`

Array of file paths or [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns). Paths are resolved relative to the current working directory.

#### options

Type: `object`

##### destination

Type: `string`\
Optional

Directory where optimized images will be saved. If omitted, images are not written to disk (only returned in the result array).

##### plugins

Type: `readonly Plugin[]`\
Default: `[]`

Array of imagemin plugins. Each plugin must be a function that accepts a `Uint8Array` and returns a `Promise<Uint8Array>`. See [available plugins](https://www.npmjs.com/browse/keyword/imageminplugin).

##### glob

Type: `boolean`\
Default: `true`

When `true`, the input strings are treated as glob patterns and expanded using [`tinyglobby`](https://github.com/antfu/tinyglobby). When `false`, input is treated as literal file paths.

##### concurrency

Type: `number`\
Default: `os.cpus().length` (number of CPU cores)

Maximum number of files to process in parallel. The default uses all available CPU cores. Set to `1` for sequential processing.

#### Example

```js
import imagemin from "imagemin-neo";
import mozjpeg from "imagemin-mozjpeg";
import pngquant from "imagemin-pngquant";

const results = await imagemin(["src/images/*.{jpg,png}"], {
  destination: "dist/images",
  plugins: [mozjpeg({ quality: 85 }), pngquant({ speed: 1, quality: [0.7, 0.8] })],
  glob: true,
});

console.log(`Optimized ${results.length} images`);
```

### imagemin.buffer(data, options?)

Optimizes an image buffer in memory (without file system operations). Returns a `Promise<Uint8Array>` containing the optimized image data.

#### data

Type: `Uint8Array`

Raw image data (e.g., from `fs.readFile`, `fetch`, or a canvas).

#### options

Type: `object`

##### plugins

Type: `readonly Plugin[]`\
Default: `[]`

Array of imagemin plugins to apply.

#### Example

```js
import imagemin from "imagemin-neo";
import svgo from "imagemin-svgo";
import { readFile, writeFile } from "node:fs/promises";

const buffer = await readFile("icon.svg");
const optimized = await imagemin.buffer(buffer, {
  plugins: [svgo({ multipass: true })],
});

await writeFile("icon-optimized.svg", optimized);
```

### More examples

#### Using multiple plugins together

```js
import imagemin from "imagemin-neo";
import mozjpeg from "imagemin-mozjpeg";
import pngquant from "imagemin-pngquant";
import svgo from "imagemin-svgo";
import { globby } from "globby";

// Process all images in a folder with different plugins per extension
const files = await globby(["src/**/*.{jpg,png,svg}"]);
const results = await imagemin(files, {
  destination: "dist/images",
  plugins: [mozjpeg({ quality: 90 }), pngquant({ speed: 2, quality: [0.6, 0.8] }), svgo()],
  glob: false, // we already expanded globs
});
```

#### Processing images without saving (in‑memory only)

```js
import imagemin from "imagemin-neo";
import sharp from "imagemin-sharp";

const results = await imagemin(["photo.jpg"], {
  // No destination → files are not written to disk
  plugins: [sharp({ resize: { width: 800 } })],
});

// Use the optimized buffer directly
const optimizedBuffer = results[0].data;
await uploadToCloud(optimizedBuffer);
```

#### Handling results

```js
const results = await imagemin(["input/*.png"], {
  destination: "output",
});

for (const { data, sourcePath, destinationPath } of results) {
  console.log(`✅ ${path.basename(sourcePath)} → ${destinationPath} (${data.length} bytes)`);
}
```

### Types

The package exports TypeScript definitions for the following interfaces:

```ts
export type Plugin = (input: Uint8Array) => Promise<Uint8Array>;

export interface Options {
  destination?: string;
  plugins?: readonly Plugin[];
  glob?: boolean;
  concurrency?: number;
}

export interface BufferOptions {
  plugins?: readonly Plugin[];
}

export interface Result {
  data: Uint8Array;
  sourcePath: string;
  destinationPath: string | undefined;
}
```

You can import them directly:

```ts
import type { Plugin, Result } from "imagemin-neo";
```

### Notes

- **Node.js only**: This library does not work in the browser. Attempting to use it in a browser environment will throw an error.
- **Zero‑width images**: Images with zero width or height (e.g., corrupt files) are skipped and not processed by plugins.
- **WebP extension**: If the optimized image is detected as WebP, the destination file extension is automatically changed to `.webp`.
- **Junk files**: System junk files (`.DS_Store`, `Thumbs.db`, etc.) are automatically filtered out.

## Related

- [`psimage`](https://github.com/llcawc/psimage) - Gulp plugin

## License

MIT License. © 2026 [llcawc](https://github.com/llcawc). Made with ❤️ to beautiful architecture.
