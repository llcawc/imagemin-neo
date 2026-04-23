import path from 'node:path'

/**
 * Changes the file extension in a path.
 * Изменяет расширение файла в пути.
 * @param filePath - Path to the file / Путь к файлу
 * @param newExtension - New extension (with or without dot) / Новое расширение (с точкой или без)
 * @returns Path with changed extension / Путь с измененным расширением
 */
export default function changeFileExtension(filePath: string, newExtension: string): string {
  // Ensure the extension starts with a dot / Убедимся, что расширение начинается с точки
  const extension = newExtension.startsWith('.') ? newExtension : `.${newExtension}`

  // Get directory and filename without extension / Получаем директорию и имя файла без расширения
  const dir = path.dirname(filePath)
  const basename = path.basename(filePath, path.extname(filePath))

  // Assemble the new path / Собираем новый путь
  return path.join(dir, basename + extension)
}
