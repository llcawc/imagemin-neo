/**
 * Checks if a filename is a junk (system) file.
 * Проверяет, является ли имя файла служебным (junk).
 * @param filename - Filename to check / Имя файла для проверки
 * @returns true if the file is NOT junk / true, если файл НЕ является служебным
 */
export function isNotJunk(filename: string): boolean {
  return !isJunk(filename)
}

/**
 * Checks if a filename is a junk (system) file.
 * Проверяет, является ли имя файла служебным (junk).
 * @param filename - Filename to check / Имя файла для проверки
 * @returns true if the file is junk / true, если файл является служебным
 */
export function isJunk(filename: string): boolean {
  const junkPatterns = [
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
    /^\._.+/,
  ]

  return junkPatterns.some((pattern) => pattern.test(filename))
}
