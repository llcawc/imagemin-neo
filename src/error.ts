// oxlint-disable typescript/no-explicit-any
/**
 * Custom error class for imagemin-neo with additional context.
 * Кастомный класс ошибки для imagemin-neo с дополнительным контекстом.
 */
export class ImageminError extends Error {
  /**
   * Path to the file that caused the error.
   * Путь к файлу, вызвавшему ошибку.
   */
  public readonly filePath?: string

  /**
   * Index of the plugin that caused the error (if applicable).
   * Индекс плагина, вызвавшего ошибку (если применимо).
   */
  public readonly pluginIndex?: number

  /**
   * Original error message before any modifications.
   * Оригинальное сообщение об ошибке до любых модификаций.
   */
  public readonly originalMessage: string

  /**
   * Original stack trace (if available).
   * Оригинальный стек вызовов (если доступен).
   */
  public readonly originalStack?: string

  /**
   * Creates a new ImageminError.
   * Создаёт новую ошибку ImageminError.
   * @param message - Error message / Сообщение об ошибке
   * @param options - Additional error options / Дополнительные опции ошибки
   */
  constructor(
    message: string,
    options?: {
      /** Path to the file that caused the error / Путь к файлу, вызвавшему ошибку */
      filePath?: string
      /** Index of the plugin that caused the error / Индекс плагина, вызвавшего ошибку */
      pluginIndex?: number
      /** Original error message / Оригинальное сообщение об ошибке */
      originalMessage?: string
      /** Original stack trace / Оригинальный стек вызовов */
      originalStack?: string
      /** Cause of the error (for error chaining) / Причина ошибки (для цепочки ошибок) */
      cause?: unknown
    },
  ) {
    super(message)

    // Ensure proper prototype chain for instanceof checks
    // Обеспечиваем правильную цепочку прототипов для проверок instanceof
    Object.setPrototypeOf(this, ImageminError.prototype)

    this.name = 'ImageminError'
    this.filePath = options?.filePath
    this.pluginIndex = options?.pluginIndex
    this.originalMessage = options?.originalMessage ?? message
    this.originalStack = options?.originalStack

    if (options?.cause) {
      ;(this as any).cause = options.cause
    }

    // Capture stack trace if not provided
    // Захватываем стек вызовов, если не предоставлен
    if (!this.originalStack && Error.captureStackTrace) {
      Error.captureStackTrace(this, ImageminError)
    }
  }

  /**
   * Creates an ImageminError from an existing Error instance.
   * Создаёт ImageminError из существующего экземпляра Error.
   * @param error - Original error / Оригинальная ошибка
   * @param options - Additional context / Дополнительный контекст
   * @returns New ImageminError instance / Новый экземпляр ImageminError
   */
  static fromError(
    error: Error,
    options?: {
      filePath?: string
      pluginIndex?: number
    },
  ): ImageminError {
    return new ImageminError(error.message, {
      filePath: options?.filePath,
      pluginIndex: options?.pluginIndex,
      originalMessage: error.message,
      originalStack: error.stack,
      cause: error,
    })
  }

  /**
   * Returns a detailed string representation of the error.
   * Возвращает детальное строковое представление ошибки.
   */
  toString(): string {
    let str = `${this.name}: ${this.message}`
    if (this.filePath) {
      str += `\nFile: ${this.filePath}`
    }
    if (this.pluginIndex !== undefined) {
      str += `\nPlugin index: ${this.pluginIndex}`
    }
    if (this.originalMessage !== this.message) {
      str += `\nOriginal message: ${this.originalMessage}`
    }
    if (this.stack) {
      str += `\nStack trace:\n${this.stack}`
    }
    return str
  }
}
