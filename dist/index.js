import { createRequire } from "node:module";
import crypto from "node:crypto";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import pLimit from "p-limit";
import { glob } from "tinyglobby";
//#region \0rolldown/runtime.js
var __require = /* @__PURE__ */ createRequire(import.meta.url);
//#endregion
//#region src/change-file-extension.ts
/**
* Changes the file extension in a path.
* Изменяет расширение файла в пути.
* @param filePath - Path to the file / Путь к файлу
* @param newExtension - New extension (with or without dot) / Новое расширение (с точкой или без)
* @returns Path with changed extension / Путь с измененным расширением
*/
function changeFileExtension(filePath, newExtension) {
	const extension = newExtension.startsWith(".") ? newExtension : `.${newExtension}`;
	const dir = path.dirname(filePath);
	const basename = path.basename(filePath, path.extname(filePath));
	return path.join(dir, basename + extension);
}
//#endregion
//#region src/environment.ts
/**
* Determines whether the code is running in a browser.
* Определяет, выполняется ли код в браузере.
* Checks for the presence of global window and document objects.
* Проверяет наличие глобальных объектов window и document.
*/
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
//#endregion
//#region src/error.ts
/**
* Custom error class for imagemin-neo with additional context.
* Кастомный класс ошибки для imagemin-neo с дополнительным контекстом.
*/
var ImageminError = class ImageminError extends Error {
	/**
	* Path to the file that caused the error.
	* Путь к файлу, вызвавшему ошибку.
	*/
	filePath;
	/**
	* Index of the plugin that caused the error (if applicable).
	* Индекс плагина, вызвавшего ошибку (если применимо).
	*/
	pluginIndex;
	/**
	* Original error message before any modifications.
	* Оригинальное сообщение об ошибке до любых модификаций.
	*/
	originalMessage;
	/**
	* Original stack trace (if available).
	* Оригинальный стек вызовов (если доступен).
	*/
	originalStack;
	/**
	* Creates a new ImageminError.
	* Создаёт новую ошибку ImageminError.
	* @param message - Error message / Сообщение об ошибке
	* @param options - Additional error options / Дополнительные опции ошибки
	*/
	constructor(message, options) {
		super(message);
		Object.setPrototypeOf(this, ImageminError.prototype);
		this.name = "ImageminError";
		this.filePath = options?.filePath;
		this.pluginIndex = options?.pluginIndex;
		this.originalMessage = options?.originalMessage ?? message;
		this.originalStack = options?.originalStack;
		if (options?.cause) this.cause = options.cause;
		if (!this.originalStack && Error.captureStackTrace) Error.captureStackTrace(this, ImageminError);
	}
	/**
	* Creates an ImageminError from an existing Error instance.
	* Создаёт ImageminError из существующего экземпляра Error.
	* @param error - Original error / Оригинальная ошибка
	* @param options - Additional context / Дополнительный контекст
	* @returns New ImageminError instance / Новый экземпляр ImageminError
	*/
	static fromError(error, options) {
		return new ImageminError(error.message, {
			filePath: options?.filePath,
			pluginIndex: options?.pluginIndex,
			originalMessage: error.message,
			originalStack: error.stack,
			cause: error
		});
	}
	/**
	* Returns a detailed string representation of the error.
	* Возвращает детальное строковое представление ошибки.
	*/
	toString() {
		let str = `${this.name}: ${this.message}`;
		if (this.filePath) str += `\nFile: ${this.filePath}`;
		if (this.pluginIndex !== void 0) str += `\nPlugin index: ${this.pluginIndex}`;
		if (this.originalMessage !== this.message) str += `\nOriginal message: ${this.originalMessage}`;
		if (this.stack) str += `\nStack trace:\n${this.stack}`;
		return str;
	}
};
//#endregion
//#region src/junk.ts
/**
* Checks if a filename is a junk (system) file.
* Проверяет, является ли имя файла служебным (junk).
* @param filename - Filename to check / Имя файла для проверки
* @returns true if the file is NOT junk / true, если файл НЕ является служебным
*/
function isNotJunk(filename) {
	return !isJunk(filename);
}
/**
* Checks if a filename is a junk (system) file.
* Проверяет, является ли имя файла служебным (junk).
* @param filename - Filename to check / Имя файла для проверки
* @returns true if the file is junk / true, если файл является служебным
*/
function isJunk(filename) {
	return [
		/^\.DS_Store$/i,
		/^\.Spotlight-V100$/i,
		/^\.Trashes$/i,
		/^\.fseventsd$/i,
		/^\.metadata_never_index$/i,
		/^\.apdisk$/i,
		/^Thumbs\.db$/i,
		/^desktop\.ini$/i,
		/^@eaDir$/i,
		/^\.sync\.db$/i,
		/^\.dropbox$/i,
		/^\.dropbox\.attr$/i,
		/^~\./,
		/^\._.+/
	].some((pattern) => pattern.test(filename));
}
//#endregion
//#region src/pipe.ts
/**
* Composition of asynchronous functions (pipeline).
* Композиция асинхронных функций (конвейер).
* Takes an array of functions and returns a new function that applies them sequentially.
* Принимает массив функций и возвращает новую функцию, которая применяет их последовательно.
* Each function receives the result of the previous one and must return a value (can be a Promise).
* Каждая функция получает результат предыдущей и должна возвращать значение (может быть Promise).
* @param fns - Array of functions to compose / Массив функций для композиции
* @returns Function that takes an initial value and returns a Promise with the result / Функция, которая принимает начальное значение и возвращает Promise с результатом
*/
function pipe(...fns) {
	return async (input) => {
		let result = input;
		for (const fn of fns) result = await fn(result);
		return result;
	};
}
//#endregion
//#region src/slash.ts
/**
* Converts a path to Unix format (replaces backslashes with forward slashes).
* Преобразует путь к Unix-формату (заменяет обратные слеши на прямые).
* @param path - Path to convert / Путь для преобразования
* @returns Path with forward slashes / Путь с прямыми слешами
*/
function slash(path) {
	return path.includes("\\") ? path.replace(/\\/g, "/") : path;
}
//#endregion
//#region src/uint8array-utils.ts
/**
* Checks if a value is an instance of Uint8Array.
* Проверяет, является ли значение экземпляром Uint8Array.
* @param value - Value to check / Значение для проверки
* @throws {TypeError} If the value is not a Uint8Array / Если значение не является Uint8Array
*/
function assertUint8Array(value) {
	if (!(value instanceof Uint8Array)) throw new TypeError(`Expected Uint8Array, got ${typeof value}`);
}
//#endregion
//#region src/validation.ts
/**
* Module for validating function arguments.
* Модуль валидации аргументов функций.
* Replacement for the `ow` dependency for type checking.
* Замена зависимости `ow` для проверки типов.
*/
/**
* Checks that a value is an array (or readonly array).
* Проверяет, что значение является массивом (или readonly массивом).
* @param value - Value to check / Проверяемое значение
* @param message - Error message (default: 'Expected value to be an array') / Сообщение об ошибке (по умолчанию 'Expected value to be an array')
* @throws {TypeError} If the value is not an array / Если значение не является массивом
*/
function assertArray(value, message = "Expected value to be an array") {
	if (!Array.isArray(value)) throw new TypeError(message);
}
/**
* Checks that a value is an array or undefined.
* Проверяет, что значение является массивом или undefined.
* @param value - Value to check / Проверяемое значение
* @param message - Error message (default: 'Expected value to be an array or undefined') / Сообщение об ошибке (по умолчанию 'Expected value to be an array or undefined')
* @throws {TypeError} If the value is not an array and not undefined / Если значение не является массивом и не undefined
*/
function assertOptionalArray(value, message = "Expected value to be an array or undefined") {
	if (value !== void 0 && !Array.isArray(value)) throw new TypeError(message);
}
/**
* Checks that a path is safe from path traversal attacks (does not contain escapes beyond the base directory).
* Проверяет, что путь безопасен от path traversal атак (не содержит переходов за пределы базовой директории).
* @param filePath - Path to check (can be relative or absolute) / Проверяемый путь (может быть относительным или абсолютным)
* @param baseDir - Base directory for resolving relative paths (default: current working directory) / Базовая директория для разрешения относительных путей (по умолчанию текущая рабочая директория)
* @param message - Error message (default: 'Path traversal detected') / Сообщение об ошибке (по умолчанию 'Path traversal detected')
* @throws {ImageminError} If path traversal is detected / Если обнаружен path traversal
*/
function assertSafePath(filePath, baseDir = process.cwd(), message = "Path traversal detected") {
	const path = __require("node:path");
	const resolved = path.resolve(baseDir, filePath);
	const normalized = path.normalize(resolved);
	const baseResolved = path.resolve(baseDir);
	const relative = path.relative(baseResolved, normalized);
	if (relative.startsWith("..") || path.isAbsolute(relative)) throw new ImageminError(message, { filePath });
}
//#endregion
//#region src/index.ts
const fileTypeCache = /* @__PURE__ */ new Map();
/**
* Generates SHA‑256 hash of data for use as a cache key.
* Генерирует хэш SHA-256 от данных для использования в качестве ключа кэша.
* @param data - Data to hash / Данные для хэширования
* @returns Hash as a hex string / Хэш в виде hex-строки
*/
async function hashData(data) {
	const hash = crypto.createHash("sha256");
	hash.update(data);
	return hash.digest("hex");
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
const handleFile = async (sourcePath, { destination, plugins = [] }) => {
	assertOptionalArray(plugins, "The `plugins` option should be an `Array`");
	let data = await fsPromises.readFile(sourcePath);
	if (plugins.length > 0) data = await pipe(...plugins)(data);
	const dataHash = await hashData(data);
	let fileType = fileTypeCache.get(dataHash);
	if (!fileType) {
		fileType = await fileTypeFromBuffer(data) ?? { ext: path.extname(sourcePath) };
		fileTypeCache.set(dataHash, fileType);
	}
	const { ext } = fileType;
	let destinationPath = destination ? path.join(destination, path.basename(sourcePath)) : void 0;
	if (destination) assertSafePath(destination, process.cwd());
	destinationPath = ext === "webp" && destinationPath ? changeFileExtension(destinationPath, "webp") : destinationPath;
	const returnValue = {
		data: new Uint8Array(data),
		sourcePath,
		destinationPath
	};
	if (!destinationPath) return returnValue;
	const destPath = destinationPath;
	await fsPromises.mkdir(path.dirname(destPath), { recursive: true });
	await fsPromises.writeFile(destPath, returnValue.data);
	return returnValue;
};
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
const imagemin = Object.assign(async function imagemin(input, { glob: glob$1 = true, concurrency = os.cpus().length, ...options } = {}) {
	if (isBrowser) throw new ImageminError("This package does not work in the browser.");
	assertArray(input);
	const unixFilePaths = input.map((path) => slash(path));
	let filePaths = glob$1 ? await glob(unixFilePaths, { onlyFiles: true }) : input;
	filePaths = filePaths.map((filePath) => path.resolve(filePath));
	for (const filePath of filePaths) assertSafePath(filePath, process.cwd());
	const limit = pLimit(Math.max(1, concurrency));
	const tasks = filePaths.filter((filePath) => isNotJunk(path.basename(filePath))).map((filePath) => limit(async () => {
		try {
			return await handleFile(filePath, options);
		} catch (error) {
			if (error instanceof ImageminError) {
				if (!error.filePath) throw new ImageminError(error.message, {
					filePath,
					pluginIndex: error.pluginIndex,
					originalMessage: error.originalMessage,
					originalStack: error.originalStack,
					cause: error.cause
				});
				throw error;
			}
			if (error instanceof Error) throw new ImageminError(`Error occurred when handling file: ${filePath}: ${error.message}`, {
				filePath,
				originalMessage: error.message,
				originalStack: error.stack,
				cause: error
			});
			throw new ImageminError(String(error), {
				filePath,
				originalMessage: String(error)
			});
		}
	}));
	return Promise.all(tasks);
}, { 
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
async buffer(data, { plugins = [] } = {}) {
	if (isBrowser) throw new ImageminError("This package does not work in the browser.");
	assertUint8Array(data);
	if (plugins.length === 0) return new Uint8Array(data);
	return new Uint8Array(await pipe(...plugins)(data));
} });
//#endregion
export { imagemin as default };
