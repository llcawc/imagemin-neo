/**
 * Determines whether the code is running in a browser.
 * Определяет, выполняется ли код в браузере.
 * Checks for the presence of global window and document objects.
 * Проверяет наличие глобальных объектов window и document.
 */
export const isBrowser: boolean = typeof window !== 'undefined' && typeof window.document !== 'undefined'
