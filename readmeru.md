# imagemin-neo

[![npm version](https://img.shields.io/npm/v/imagemin-neo?style=flat&logo=npm)](https://www.npmjs.com/package/imagemin-neo)
[![license](https://img.shields.io/npm/l/imagemin-neo?style=flat-square)](https://github.com/llcawc/imagemin-neo/blob/main/license)
[![node version](https://img.shields.io/node/v/imagemin-neo?style=flat&logo=node.js)](https://nodejs.org)
[![Downloads](https://img.shields.io/npm/dm/imagemin-neo.svg?style=flat&logo=npm)](https://www.npmjs.com/package/imagemin-neo)
[![tests](https://img.shields.io/badge/tests-20%20passed-brightgreen?style=flat-square)](https://github.com/llcawc/imagemin-neo/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-✓-007ACC?style=flat-square)](https://www.typescriptlang.org/)

> **Уведомление о форке**: Это форк оригинального пакета [`imagemin`](https://github.com/imagemin/imagemin). Данный форк включает несколько улучшений и модернизаций.

> Минификация изображений без лишних усилий

## ✨ Улучшения

Этот форк приносит ряд улучшений по сравнению с оригинальным `imagemin`:

- **Сокращённые зависимости** – несколько внешних пакетов заменены на лёгкие собственные реализации
- **Полная поддержка TypeScript** – написан на TypeScript, включает типы из коробки
- **Обновлённый инструментарий** – использует `oxlint` и `oxfmt` для быстрого линтинга/форматирования, `vitest` для тестирования
- **Node.js 20+** – ориентирован на текущие LTS‑версии
- **Более чистый код** – переписан на TypeScript с явными типами и улучшенной документацией

## Установка

```sh
npm install imagemin-neo
# or using pnpm
pnpm add imagemin-neo
# or using yarn
yarn add imagemin-neo
```

## Использование

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

Оптимизирует изображения из файловой системы. Возвращает `Promise<Result[]>`, где каждый объект `Result` содержит:

```ts
{
  data: Uint8Array; // Оптимизированные данные изображения
  sourcePath: string; // Абсолютный путь к исходному файлу
  destinationPath: string; // Абсолютный путь, по которому файл был сохранён (или `undefined`, если destination не указан)
}
```

#### input

Тип: `readonly string[]`

Массив путей к файлам или [glob‑паттернов](https://github.com/sindresorhus/globby#globbing-patterns). Пути разрешаются относительно текущей рабочей директории.

#### options

Тип: `object`

##### destination

Тип: `string`\
Необязательный

Директория, в которую будут сохранены оптимизированные изображения. Если не указана, изображения не записываются на диск (только возвращаются в массиве результатов).

##### plugins

Тип: `readonly Plugin[]`\
По умолчанию: `[]`

Массив плагинов imagemin. Каждый плагин должен быть функцией, принимающей `Uint8Array` и возвращающей `Promise<Uint8Array>`. См. [доступные плагины](https://www.npmjs.com/browse/keyword/imageminplugin).

##### glob

Тип: `boolean`\
По умолчанию: `true`

Если `true`, строки входного массива трактуются как glob‑паттерны и раскрываются с помощью [`tinyglobby`](https://github.com/antfu/tinyglobby). Если `false`, входные данные считаются буквальными путями к файлам.

##### concurrency

Тип: `number`\
По умолчанию: `os.cpus().length` (количество ядер CPU)

Максимальное количество файлов, обрабатываемых параллельно. По умолчанию используются все доступные ядра CPU. Установите в `1` для последовательной обработки.

#### Пример

```js
import imagemin from "imagemin-neo";
import mozjpeg from "imagemin-mozjpeg";
import pngquant from "imagemin-pngquant";

const results = await imagemin(["src/images/*.{jpg,png}"], {
  destination: "dist/images",
  plugins: [mozjpeg({ quality: 85 }), pngquant({ speed: 1, quality: [0.7, 0.8] })],
  glob: true,
});

console.log(`Оптимизировано ${results.length} изображений`);
```

### imagemin.buffer(data, options?)

Оптимизирует изображение в памяти (без операций с файловой системой). Возвращает `Promise<Uint8Array>` с оптимизированными данными изображения.

#### data

Тип: `Uint8Array`

Сырые данные изображения (например, из `fs.readFile`, `fetch` или canvas).

#### options

Тип: `object`

##### plugins

Тип: `readonly Plugin[]`\
По умолчанию: `[]`

Массив плагинов imagemin для применения.

#### Пример

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

### Дополнительные примеры

#### Использование нескольких плагинов вместе

```js
import imagemin from "imagemin-neo";
import mozjpeg from "imagemin-mozjpeg";
import pngquant from "imagemin-pngquant";
import svgo from "imagemin-svgo";
import { globby } from "globby";

// Обработать все изображения в папке с разными плагинами для каждого расширения
const files = await globby(["src/**/*.{jpg,png,svg}"]);
const results = await imagemin(files, {
  destination: "dist/images",
  plugins: [mozjpeg({ quality: 90 }), pngquant({ speed: 2, quality: [0.6, 0.8] }), svgo()],
  glob: false, // мы уже раскрыли glob‑паттерны
});
```

#### Обработка изображений без сохранения (только в памяти)

```js
import imagemin from "imagemin-neo";
import sharp from "imagemin-sharp";

const results = await imagemin(["photo.jpg"], {
  // Нет destination → файлы не записываются на диск
  plugins: [sharp({ resize: { width: 800 } })],
});

// Используем оптимизированный буфер напрямую
const optimizedBuffer = results[0].data;
await uploadToCloud(optimizedBuffer);
```

#### Обработка результатов

```js
const results = await imagemin(["input/*.png"], {
  destination: "output",
});

for (const { data, sourcePath, destinationPath } of results) {
  console.log(`✅ ${path.basename(sourcePath)} → ${destinationPath} (${data.length} байт)`);
}
```

### Типы

Пакет экспортирует TypeScript‑определения для следующих интерфейсов:

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

Их можно импортировать напрямую:

```ts
import type { Plugin, Result } from "imagemin-neo";
```

### Примечания

- **Только Node.js**: Эта библиотека не работает в браузере. Попытка использовать её в браузерном окружении выбросит ошибку.
- **Изображения нулевой ширины/высоты**: Изображения с нулевой шириной или высотой (например, повреждённые файлы) пропускаются и не обрабатываются плагинами.
- **Расширение WebP**: Если оптимизированное изображение определяется как WebP, расширение целевого файла автоматически меняется на `.webp`.
- **Служебные файлы**: Системные служебные файлы (`.DS_Store`, `Thumbs.db` и т.п.) автоматически отфильтровываются.

## Связанные проекты

- [`psimage`](https://github.com/llcawc/psimage) – плагин для Gulp

## Лицензия

MIT License. © 2026 [llcawc](https://github.com/llcawc). Сделано с ❤️ для красивой архитектуры.
