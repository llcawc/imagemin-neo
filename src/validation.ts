// oxlint-disable typescript/no-explicit-any
/**
 * Module for validating function arguments.
 * Модуль валидации аргументов функций.
 * Replacement for the `ow` dependency for type checking.
 * Замена зависимости `ow` для проверки типов.
 */
import { ImageminError } from './error.js'

/**
 * Checks that a value is an array (or readonly array).
 * Проверяет, что значение является массивом (или readonly массивом).
 * @param value - Value to check / Проверяемое значение
 * @param message - Error message (default: 'Expected value to be an array') / Сообщение об ошибке (по умолчанию 'Expected value to be an array')
 * @throws {TypeError} If the value is not an array / Если значение не является массивом
 */
export function assertArray(
  value: unknown,
  message = 'Expected value to be an array',
): asserts value is readonly any[] {
  if (!Array.isArray(value)) {
    throw new TypeError(message)
  }
}

/**
 * Checks that a value is an array or undefined.
 * Проверяет, что значение является массивом или undefined.
 * @param value - Value to check / Проверяемое значение
 * @param message - Error message (default: 'Expected value to be an array or undefined') / Сообщение об ошибке (по умолчанию 'Expected value to be an array or undefined')
 * @throws {TypeError} If the value is not an array and not undefined / Если значение не является массивом и не undefined
 */
export function assertOptionalArray(
  value: unknown,
  message = 'Expected value to be an array or undefined',
): asserts value is readonly any[] | undefined {
  if (value !== undefined && !Array.isArray(value)) {
    throw new TypeError(message)
  }
}

/**
 * Checks that a value is a string.
 * Проверяет, что значение является строкой.
 * @param value - Value to check / Проверяемое значение
 * @param message - Error message (default: 'Expected value to be a string') / Сообщение об ошибке (по умолчанию 'Expected value to be a string')
 * @throws {TypeError} If the value is not a string / Если значение не является строкой
 */
export function assertString(value: unknown, message = 'Expected value to be a string'): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(message)
  }
}

/**
 * Checks that a value is a number.
 * Проверяет, что значение является числом.
 * @param value - Value to check / Проверяемое значение
 * @param message - Error message (default: 'Expected value to be a number') / Сообщение об ошибке (по умолчанию 'Expected value to be a number')
 * @throws {TypeError} If the value is not a number / Если значение не является числом
 */
export function assertNumber(value: unknown, message = 'Expected value to be a number'): asserts value is number {
  if (typeof value !== 'number') {
    throw new TypeError(message)
  }
}

/**
 * Checks that a value is a boolean.
 * Проверяет, что значение является булевым.
 * @param value - Value to check / Проверяемое значение
 * @param message - Error message (default: 'Expected value to be a boolean') / Сообщение об ошибке (по умолчанию 'Expected value to be a boolean')
 * @throws {TypeError} If the value is not a boolean / Если значение не является булевым
 */
export function assertBoolean(value: unknown, message = 'Expected value to be a boolean'): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(message)
  }
}

/**
 * Checks that a value is an object (but not null and not an array).
 * Проверяет, что значение является объектом (но не null и не массивом).
 * @param value - Value to check / Проверяемое значение
 * @param message - Error message (default: 'Expected value to be an object') / Сообщение об ошибке (по умолчанию 'Expected value to be an object')
 * @throws {TypeError} If the value is not an object / Если значение не является объектом
 */
export function assertObject(value: unknown, message = 'Expected value to be an object'): asserts value is object {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(message)
  }
}

/**
 * Checks that a value is a function.
 * Проверяет, что значение является функцией.
 * @param value - Value to check / Проверяемое значение
 * @param message - Error message (default: 'Expected value to be a function') / Сообщение об ошибке (по умолчанию 'Expected value to be a function')
 * @throws {TypeError} If the value is not a function / Если значение не является функцией
 */
export function assertFunction(value: unknown, message = 'Expected value to be a function'): asserts value is Function {
  if (typeof value !== 'function') {
    throw new TypeError(message)
  }
}

/**
 * Checks that a path is safe from path traversal attacks (does not contain escapes beyond the base directory).
 * Проверяет, что путь безопасен от path traversal атак (не содержит переходов за пределы базовой директории).
 * @param filePath - Path to check (can be relative or absolute) / Проверяемый путь (может быть относительным или абсолютным)
 * @param baseDir - Base directory for resolving relative paths (default: current working directory) / Базовая директория для разрешения относительных путей (по умолчанию текущая рабочая директория)
 * @param message - Error message (default: 'Path traversal detected') / Сообщение об ошибке (по умолчанию 'Path traversal detected')
 * @throws {ImageminError} If path traversal is detected / Если обнаружен path traversal
 */
export function assertSafePath(
  filePath: string,
  baseDir: string = process.cwd(),
  message = 'Path traversal detected',
): void {
  const path = require('node:path')
  const resolved = path.resolve(baseDir, filePath)
  const normalized = path.normalize(resolved)
  const baseResolved = path.resolve(baseDir)
  // Check that the normalized path is inside the base directory / Проверяем, что нормализованный путь находится внутри базовой директории
  // Use path.relative to determine if the path escapes baseDir / Используем path.relative для определения, не выходит ли путь за пределы baseDir
  const relative = path.relative(baseResolved, normalized)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ImageminError(message, { filePath })
  }
}
