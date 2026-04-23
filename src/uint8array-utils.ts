/**
 * Checks if a value is an instance of Uint8Array.
 * Проверяет, является ли значение экземпляром Uint8Array.
 * @param value - Value to check / Значение для проверки
 * @throws {TypeError} If the value is not a Uint8Array / Если значение не является Uint8Array
 */
export function assertUint8Array(value: unknown): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError(`Expected Uint8Array, got ${typeof value}`)
  }
}

/**
 * Checks if a value is an instance of Uint8Array.
 * Проверяет, является ли значение экземпляром Uint8Array.
 * @param value - Value to check / Значение для проверки
 * @returns true if the value is a Uint8Array / true, если значение является Uint8Array
 */
export function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
}
