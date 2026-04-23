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
export default function pipe<T>(...fns: Array<(input: T) => T | Promise<T>>): (input: T) => Promise<T> {
  return async (input: T): Promise<T> => {
    let result = input
    for (const fn of fns) {
      result = await fn(result)
    }
    return result
  }
}
