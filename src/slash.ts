/**
 * Converts a path to Unix format (replaces backslashes with forward slashes).
 * Преобразует путь к Unix-формату (заменяет обратные слеши на прямые).
 * @param path - Path to convert / Путь для преобразования
 * @returns Path with forward slashes / Путь с прямыми слешами
 */
export default function slash(path: string): string {
  return path.includes('\\') ? path.replace(/\\/g, '/') : path
}
