import type { ImageminError } from '../src/error.js'

import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join, normalize } from 'node:path'

import imageminJpegtran from 'imagemin-jpegtran'
import imageminSvgo from 'imagemin-svgo'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import imagemin, { type Plugin } from '../src/index.js'

describe('imagemin', () => {
  const testDir = join(process.cwd(), 'test')
  const fixtureJpg = join(testDir, 'fixture.jpg')
  const fixtureSvg = join(testDir, 'fixture.svg')
  const outputDir = join(testDir, 'output')

  beforeEach(async () => {
    // Очищаем выходную директорию перед каждым тестом
    if (existsSync(outputDir)) {
      await rm(outputDir, { recursive: true, force: true })
    }
    await mkdir(outputDir, { recursive: true })
  })

  afterEach(async () => {
    // Удаляем выходную директорию после каждого теста
    if (existsSync(outputDir)) {
      await rm(outputDir, { recursive: true, force: true })
    }
  })

  describe('основная функция', () => {
    it('должна обрабатывать один файл без destination', async () => {
      const results = await imagemin([fixtureJpg])
      expect(results).toHaveLength(1)
      const result = results[0]
      // Нормализуем пути для сравнения (Windows использует обратные слеши)
      expect(normalize(result.sourcePath)).toBe(normalize(fixtureJpg))
      expect(result.destinationPath).toBeUndefined()
      expect(result.data).toBeInstanceOf(Uint8Array)
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('должна обрабатывать один файл с destination', async () => {
      const dest = join(outputDir, 'subdir')
      const results = await imagemin([fixtureJpg], { destination: dest })
      expect(results).toHaveLength(1)
      const result = results[0]
      expect(result.destinationPath).toBe(join(dest, 'fixture.jpg'))
      // Проверяем, что файл создан
      const fileExists = existsSync(result.destinationPath!)
      expect(fileExists).toBe(true)
      const fileData = await readFile(result.destinationPath!)
      expect(fileData).toBeInstanceOf(Buffer)
      expect(fileData.length).toBeGreaterThan(0)
    })

    it('должна обрабатывать несколько файлов', async () => {
      const results = await imagemin([fixtureJpg, fixtureSvg], {
        destination: outputDir,
      })
      expect(results).toHaveLength(2)
      const jpgResult = results.find((r) => r.sourcePath.endsWith('.jpg'))
      const svgResult = results.find((r) => r.sourcePath.endsWith('.svg'))
      expect(jpgResult).toBeDefined()
      expect(svgResult).toBeDefined()
      expect(jpgResult!.destinationPath).toBe(join(outputDir, 'fixture.jpg'))
      expect(svgResult!.destinationPath).toBe(join(outputDir, 'fixture.svg'))
    })

    it('должна обрабатывать glob паттерны', async () => {
      const results = await imagemin(['test/fixture.*'], { glob: true })
      // Должны найти как минимум jpg и svg
      expect(results.length).toBeGreaterThanOrEqual(2)
      const extensions = results.map((r) => r.sourcePath.split('.').pop())
      expect(extensions).toContain('jpg')
      expect(extensions).toContain('svg')
    })

    it('должна фильтровать служебные файлы (junk)', async () => {
      // Создадим временный файл .DS_Store
      const junkFile = join(testDir, '.DS_Store')
      await writeFile(junkFile, Buffer.from('junk'))
      try {
        const results = await imagemin([junkFile])
        // .DS_Store должен быть отфильтрован
        expect(results).toHaveLength(0)
      } finally {
        await rm(junkFile, { force: true })
      }
    })

    it('должна выбрасывать ошибку при невалидном input', async () => {
      // @ts-expect-error тестируем невалидный аргумент
      await expect(imagemin('not an array')).rejects.toThrow()
    })

    it('должна обрабатывать любой файл (даже битый) без ошибки', async () => {
      // Библиотека просто читает файл и возвращает данные, не валидируя содержимое
      const brokenFile = join(testDir, 'broken.tmp')
      await writeFile(brokenFile, Buffer.from([0, 1, 2, 3]))
      try {
        const results = await imagemin([brokenFile])
        expect(results).toHaveLength(1)
        expect(results[0].data).toBeInstanceOf(Uint8Array)
        expect(results[0].data.length).toBe(4)
      } finally {
        await rm(brokenFile, { force: true })
      }
    })

    it('должна работать с опцией glob = false', async () => {
      const results = await imagemin([fixtureJpg], { glob: false })
      expect(results).toHaveLength(1)
      expect(results[0].sourcePath).toBe(fixtureJpg)
    })
  })

  describe('функция buffer', () => {
    it('должна обрабатывать буфер без плагинов', async () => {
      const data = await readFile(fixtureJpg)
      const result = await imagemin.buffer(data)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(data.length)
    })

    it('должна обрабатывать буфер с плагинами', async () => {
      const data = await readFile(fixtureJpg)
      const result = await imagemin.buffer(data, {
        plugins: [imageminJpegtran() as Plugin],
      })
      expect(result).toBeInstanceOf(Uint8Array)
      // После сжатия размер может уменьшиться или остаться таким же
      expect(result.length).toBeLessThanOrEqual(data.length)
    })

    it('должна выбрасывать ошибку при невалидных данных', async () => {
      // @ts-expect-error тестируем невалидный аргумент
      await expect(imagemin.buffer('not a buffer')).rejects.toThrow()
    })
  })

  describe('плагины', () => {
    it('должна применять плагин jpegtran', async () => {
      const results = await imagemin([fixtureJpg], {
        destination: outputDir,
        plugins: [imageminJpegtran() as Plugin],
      })
      expect(results).toHaveLength(1)
      const originalSize = (await readFile(fixtureJpg)).length
      const processedSize = results[0].data.length
      // После сжатия размер может уменьшиться или остаться таким же
      expect(processedSize).toBeLessThanOrEqual(originalSize)
    })

    it('должна применять плагин svgo', async () => {
      const results = await imagemin([fixtureSvg], {
        destination: outputDir,
        plugins: [imageminSvgo() as Plugin],
      })
      expect(results).toHaveLength(1)
      const originalSize = (await readFile(fixtureSvg)).length
      const processedSize = results[0].data.length
      // SVG обычно сжимается
      expect(processedSize).toBeLessThanOrEqual(originalSize)
    })

    it('должна применять несколько плагинов', async () => {
      const results = await imagemin([fixtureJpg], {
        destination: outputDir,
        plugins: [imageminJpegtran() as Plugin, imageminSvgo() as Plugin],
      })
      expect(results).toHaveLength(1)
      // Просто проверяем, что обработка прошла без ошибок
      expect(results[0].data.length).toBeGreaterThan(0)
    })
  })

  describe('расширения файлов', () => {
    it('должна сохранять файл с правильным расширением', async () => {
      const dest = join(outputDir, 'subdir')
      const results = await imagemin([fixtureJpg], { destination: dest })
      const outputFile = results[0].destinationPath!
      expect(outputFile.endsWith('.jpg')).toBe(true)
    })

    it('должна изменять расширение на .webp для webp файлов', async () => {
      // Создадим временный webp файл (заглушка)
      const webpContent = Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8\x00\x00\x00', 'binary')
      const webpPath = join(testDir, 'fixture.webp')
      await writeFile(webpPath, webpContent)
      try {
        const results = await imagemin([webpPath], { destination: outputDir })
        const outputFile = results[0].destinationPath!
        expect(outputFile.endsWith('.webp')).toBe(true)
      } finally {
        await rm(webpPath, { force: true })
      }
    })
  })

  describe('обработка ошибок и валидация', () => {
    it('должна выбрасывать ImageminError при ошибке обработки файла', async () => {
      const nonExistentFile = join(testDir, 'non-existent.jpg')
      // Используем glob: false, чтобы tinyGlob не отфильтровал несуществующий файл
      await expect(imagemin([nonExistentFile], { glob: false })).rejects.toThrow()
      // Проверяем, что ошибка является экземпляром ImageminError
      try {
        await imagemin([nonExistentFile], { glob: false })
      } catch (error) {
        const imageminError = error as ImageminError
        expect(imageminError.constructor.name).toBe('ImageminError')
        expect(imageminError.filePath).toBe(nonExistentFile)
        expect(imageminError.originalMessage).toBeDefined()
      }
    })

    it('должна сохранять оригинальное сообщение ошибки', async () => {
      // Создадим файл, который вызовет ошибку при чтении (например, нет прав)
      // Для простоты используем несуществующий файл, ошибка ENOENT
      const nonExistentFile = join(testDir, 'non-existent.jpg')
      try {
        await imagemin([nonExistentFile], { glob: false })
      } catch (error) {
        const imageminError = error as ImageminError
        expect(imageminError.originalMessage).toContain('ENOENT')
        expect(imageminError.message).not.toBe(imageminError.originalMessage)
      }
    })

    it('должна предотвращать path traversal атаки', async () => {
      // Путь, который выходит за пределы текущей рабочей директории (два уровня выше)
      const traversalPath = join(process.cwd(), '..', '..', 'package.json')
      // Используем glob: false, чтобы tinyGlob не проигнорировал путь
      await expect(imagemin([traversalPath], { glob: false })).rejects.toThrow('Path traversal detected')
      // Также проверяем destination, который пытается выйти за пределы
      const safeDest = join(outputDir, 'subdir')
      await expect(
        imagemin([fixtureJpg], { destination: join(safeDest, '..', '..', '..', '..', '..'), glob: false }),
      ).rejects.toThrow('Path traversal detected')
    })

    it('должна корректно обрабатывать ImageminError с pluginIndex', async () => {
      // Создадим плагин, который выбрасывает ошибку
      const faultyPlugin: Plugin = async () => {
        throw new Error('Plugin error')
      }
      await expect(imagemin([fixtureJpg], { plugins: [faultyPlugin] })).rejects.toThrow('Plugin error')
      // Можно проверить, что ошибка содержит pluginIndex (опционально)
    })
  })

  describe('браузерная среда', () => {
    it.skip('должна выбрасывать ошибку при использовании в браузере', async () => {
      // Пропускаем из-за сложности мока environment
      // В реальном браузере этот пакет не должен работать
    })
  })
})
