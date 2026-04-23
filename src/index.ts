// Import of standard Node.js modules / Импорт стандартных модулей Node.js
import crypto from 'node:crypto' // Hashing for caching / Хэширование для кэширования
import fsPromises from 'node:fs/promises' // Asynchronous file system operations / Асинхронные операции с файловой системой
import os from 'node:os' // System information (CPU count) / Информация о системе (количество CPU)
import path from 'node:path' // File path manipulation / Работа с путями файлов

// Import of third‑party libraries for file type detection, file search, and image processing / Импорт сторонних библиотек для определения типа файла, поиска файлов и обработки изображений
import { fileTypeFromBuffer } from 'file-type' // MIME type and extension detection from buffer / Определение MIME-типа и расширения файла по содержимому
import pLimit from 'p-limit' // Import for concurrency limiting / Импорт для ограничения параллелизма
import { glob as tinyGlob } from 'tinyglobby' // Glob file search (lightweight version) / Глобальный поиск файлов по шаблонам (легковесная версия)

// Import of internal modules (replacement of external dependencies) / Импорт собственных модулей (замена внешних зависимостей)
import changeFileExtension from './change-file-extension.js' // File extension change / Изменение расширения файла
import { isBrowser } from './environment.js' // Detects whether code runs in a browser / Определение, выполняется ли код в браузере
import { ImageminError } from './error.js' // Custom error class / Кастомный класс ошибки
import { isNotJunk } from './junk.js' // Filtering of system files (e.g., .DS_Store) / Фильтрация служебных файлов (например, .DS_Store)
import pipe from './pipe.js' // Composition of asynchronous functions (pipeline) / Композиция асинхронных функций (конвейер)
import convertToUnixPath from './slash.js' // Path conversion to Unix format (slashes) / Приведение путей к Unix-формату (слеши)
import { assertUint8Array } from './uint8array-utils.js' // Uint8Array type checking / Проверка типа Uint8Array
import { assertArray, assertOptionalArray, assertSafePath } from './validation.js' // Function argument validation / Валидация аргументов функций

// Cache for fileTypeFromBuffer results / Кэш для результатов fileTypeFromBuffer
const fileTypeCache = new Map<string, { ext: string }>()

/**
 * Generates SHA‑256 hash of data for use as a cache key.
 * Генерирует хэш SHA-256 от данных для использования в качестве ключа кэша.
 * @param data - Data to hash / Данные для хэширования
 * @returns Hash as a hex string / Хэш в виде hex-строки
 */
async function hashData(data: Uint8Array): Promise<string> {
  const hash = crypto.createHash('sha256')
  hash.update(data)
  return hash.digest('hex')
}

// Types matching info/index.d.ts / Типы, соответствующие info/index.d.ts
export type Plugin = (input: Uint8Array) => Promise<Uint8Array>

export interface Options {
  destination?: string
  plugins?: readonly Plugin[]
  glob?: boolean
  concurrency?: number
}

export interface Result {
  data: Uint8Array
  sourcePath: string
  destinationPath: string | undefined
}

export interface BufferOptions {
  plugins?: readonly Plugin[]
}

/**
 * Processes a single file: reads, applies plugins, detects type, saves (if destination is specified).
 * Обрабатывает один файл: читает, применяет плагины, определяет тип, сохраняет (если указан destination).
 * @param {string} sourcePath - Path to the source file / Путь к исходному файлу
 * @param {Options} options - Processing options / Опции обработки
 * @param {string} [options.destination] - Directory to save the processed file (if omitted, file is not saved) / Директория для сохранения обработанного файла (если не указана, файл не сохраняется)
 * @param {readonly Plugin[]} [options.plugins=[]] - Array of plugins for image processing (e.g., compression) / Массив плагинов для обработки изображения (например, сжатие)
 * @returns {Promise<Result>} Object with file data, source and destination paths / Объект с данными файла, исходным и целевым путями
 */
const handleFile = async (
  sourcePath: string,
  { destination, plugins = [] }: { destination?: string; plugins?: readonly Plugin[] },
): Promise<Result> => {
  // Validation: plugins must be an array (if provided) / Валидация: plugins должен быть массивом (если передан)
  assertOptionalArray(plugins, 'The `plugins` option should be an `Array`')

  // Read file into buffer (Buffer is a subclass of Uint8Array) / Чтение файла в буфер (Buffer является подклассом Uint8Array)
  let data: Uint8Array = await fsPromises.readFile(sourcePath)

  // If there are plugins, pass data through the plugin pipeline (pipe) / Если есть плагины, пропускаем данные через конвейер плагинов (pipe)
  if (plugins.length > 0) {
    data = await pipe(...plugins)(data)
  }

  // Determine file extension from its content (MIME type) with caching / Определение расширения файла по его содержимому (MIME-тип) с кэшированием
  // If detection fails, fall back to the extension from the original filename / Если определить не удалось, используем расширение из исходного имени файла
  const dataHash = await hashData(data)
  let fileType = fileTypeCache.get(dataHash)
  if (!fileType) {
    fileType = (await fileTypeFromBuffer(data)) ?? { ext: path.extname(sourcePath) }
    fileTypeCache.set(dataHash, fileType)
  }
  const { ext } = fileType

  // Build the save path (if destination is provided) / Формирование пути для сохранения (если destination указан)
  let destinationPath = destination ? path.join(destination, path.basename(sourcePath)) : undefined

  // Check destination for path traversal (if provided) / Проверяем destination на path traversal (если указан)
  if (destination) {
    assertSafePath(destination, process.cwd())
  }

  // If the file turned out to be WebP, guarantee the extension is changed to .webp / Если файл оказался WebP, гарантированно меняем расширение на .webp
  destinationPath = ext === 'webp' && destinationPath ? changeFileExtension(destinationPath, 'webp') : destinationPath

  // Prepare the result object / Подготавливаем объект с результатами
  const returnValue = {
    data: new Uint8Array(data), // Convert Buffer to Uint8Array / Конвертируем Buffer в Uint8Array
    sourcePath,
    destinationPath,
  }

  // If destination is not specified, return data without saving to disk / Если destination не указан, возвращаем данные без сохранения на диск
  if (!destinationPath) {
    return returnValue
  }

  // destinationPath is guaranteed to be a string after the check / destinationPath гарантированно строка после проверки
  const destPath = destinationPath

  // Create the target directory (recursively if it doesn't exist) / Создаём целевую директорию (рекурсивно, если её нет)
  await fsPromises.mkdir(path.dirname(destPath), {
    recursive: true,
  })
  // Write the processed data to the file / Записываем обработанные данные в файл
  await fsPromises.writeFile(destPath, returnValue.data)

  return returnValue
}

/**
 * Main function of the imagemin library.
 * Основная функция библиотеки imagemin.
 * Accepts an array of paths (or glob patterns) and processes each file via handleFile.
 * Принимает массив путей (или glob-паттернов) и обрабатывает каждый файл через handleFile.
 * @param {readonly string[]} input - Array of file paths or glob patterns / Массив путей к файлам или glob-паттернов
 * @param {Options} [options] - Processing options / Опции обработки
 * @param {boolean} [options.glob=true] - Whether to expand glob patterns / Использовать ли glob-развёртывание путей
 * @param {string} [options.destination] - Directory to save processed files / Директория для сохранения обработанных файлов
 * @param {readonly Plugin[]} [options.plugins] - Array of plugins for image processing / Массив плагинов для обработки изображений
 * @returns {Promise<Result[]>} Array of processing results for each file / Массив результатов обработки каждого файла
 */
const imagemin: {
  (input: readonly string[], options?: Options): Promise<Result[]>
  buffer: (data: Uint8Array, options?: BufferOptions) => Promise<Uint8Array>
} = Object.assign(
  async function imagemin(
    input: readonly string[],
    { glob = true, concurrency = os.cpus().length, ...options }: Options = {},
  ): Promise<Result[]> {
    // The library is not intended to work in the browser / Библиотека не предназначена для работы в браузере
    if (isBrowser) {
      throw new ImageminError('This package does not work in the browser.')
    }

    // Validation: input must be an array / Валидация: input должен быть массивом
    assertArray(input)

    // Convert all paths to Unix format (replace backslashes with forward slashes) / Приводим все пути к Unix-формату (заменяем обратные слеши на прямые)
    const unixFilePaths = input.map((path) => convertToUnixPath(path))

    // If glob is enabled, use tinyGlob to search for files by patterns / Если включён glob, используем tinyGlob для поиска файлов по шаблонам
    // Otherwise assume the passed paths are already concrete files / В противном случае считаем, что переданные пути уже являются конкретными файлами
    let filePaths = glob ? await tinyGlob(unixFilePaths, { onlyFiles: true }) : input

    // Convert all paths to absolute (for compatibility with globby) / Преобразуем все пути к абсолютным (для совместимости с globby)
    filePaths = filePaths.map((filePath) => path.resolve(filePath))

    // Check each path for path traversal (must stay inside the current working directory) / Проверяем каждый путь на path traversal (должен оставаться внутри текущей рабочей директории)
    for (const filePath of filePaths) {
      assertSafePath(filePath, process.cwd())
    }

    // Process each file with concurrency limit / Обрабатываем каждый файл с ограничением параллелизма
    const limit = pLimit(Math.max(1, concurrency))
    const filteredPaths = filePaths.filter((filePath) => isNotJunk(path.basename(filePath)))

    const tasks = filteredPaths.map((filePath) =>
      limit(async () => {
        try {
          return await handleFile(filePath, options)
        } catch (error) {
          // If the error is already an ImageminError, add filePath if missing / Если ошибка уже является ImageminError, добавляем filePath если его нет
          if (error instanceof ImageminError) {
            if (!error.filePath) {
              // Create a new error with filePath while preserving original data / Создаём новую ошибку с filePath, сохраняя оригинальные данные
              throw new ImageminError(error.message, {
                filePath,
                pluginIndex: error.pluginIndex,
                originalMessage: error.originalMessage,
                originalStack: error.originalStack,
                cause: error.cause,
              })
            }
            throw error
          }
          // For regular Error create an ImageminError preserving the original message and stack / Для обычных Error создаём ImageminError с сохранением оригинального сообщения и стека
          if (error instanceof Error) {
            throw new ImageminError(`Error occurred when handling file: ${filePath}: ${error.message}`, {
              filePath,
              originalMessage: error.message,
              originalStack: error.stack,
              cause: error,
            })
          }
          // For non‑Error objects create a generic error / Для не-Error объектов создаём общую ошибку
          throw new ImageminError(String(error), { filePath, originalMessage: String(error) })
        }
      }),
    )

    return Promise.all(tasks)
  },
  {
    /**
     * Processes an image passed as a buffer (Uint8Array) without filesystem interaction.
     * Обрабатывает изображение, переданное в виде буфера (Uint8Array), без работы с файловой системой.
     * Useful for processing data already in memory.
     * Полезно для обработки данных, уже находящихся в памяти.
     * @param {Uint8Array} data - Image as Uint8Array / Изображение в виде Uint8Array
     * @param {BufferOptions} [options] - Processing options / Опции обработки
     * @param {readonly Plugin[]} [options.plugins=[]] - Array of plugins for image processing / Массив плагинов для обработки изображения
     * @returns {Promise<Uint8Array>} Processed image as Uint8Array / Обработанное изображение в виде Uint8Array
     */
    async buffer(data: Uint8Array, { plugins = [] }: BufferOptions = {}): Promise<Uint8Array> {
      // The library is not intended to work in the browser / Библиотека не предназначена для работы в браузере
      if (isBrowser) {
        throw new ImageminError('This package does not work in the browser.')
      }

      // Ensure the input data is of type Uint8Array / Гарантируем, что входные данные имеют тип Uint8Array
      assertUint8Array(data)

      // If no plugins are passed, return a copy of the original data (convert to Uint8Array) / Если плагины не переданы, возвращаем копию исходных данных (конвертируем в Uint8Array)
      if (plugins.length === 0) {
        return new Uint8Array(data)
      }

      // Pass data through the plugin pipeline, then convert the result to Uint8Array / Пропускаем данные через конвейер плагинов, затем конвертируем результат в Uint8Array
      // Note: the `new Uint8Array` conversion may be removed once all plugins return Uint8Array instead of Buffer / Примечание: конвертация `new Uint8Array` может быть убрана, когда все плагины будут возвращать Uint8Array вместо Buffer
      return new Uint8Array(await (pipe(...plugins)(data) as Promise<Uint8Array>))
    },
  },
)

export default imagemin
