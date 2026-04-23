//#region src/index.d.ts
type Plugin = (input: Uint8Array) => Promise<Uint8Array>;
interface Options {
  destination?: string;
  plugins?: readonly Plugin[];
  glob?: boolean;
  concurrency?: number;
}
interface Result {
  data: Uint8Array;
  sourcePath: string;
  destinationPath: string | undefined;
}
interface BufferOptions {
  plugins?: readonly Plugin[];
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
declare const imagemin: {
  (input: readonly string[], options?: Options): Promise<Result[]>;
  buffer: (data: Uint8Array, options?: BufferOptions) => Promise<Uint8Array>;
};
//#endregion
export { BufferOptions, Options, Plugin, Result, imagemin as default };