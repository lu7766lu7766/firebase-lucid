/**
 * 將陣列按指定 key 分組
 *
 * @param array - 要分組的陣列
 * @param key - 分組的 key
 * @returns 分組後的物件
 *
 * @example
 * const posts = [
 *   { id: 1, userId: 'a' },
 *   { id: 2, userId: 'a' },
 *   { id: 3, userId: 'b' }
 * ]
 * groupBy(posts, 'userId')
 * // { a: [{ id: 1, userId: 'a' }, { id: 2, userId: 'a' }], b: [{ id: 3, userId: 'b' }] }
 */
export function groupBy<T extends Record<string, any>>(
  array: T[],
  key: string
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = item[key]
    if (groupKey === undefined || groupKey === null) {
      return result
    }
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {} as Record<string, T[]>)
}

/**
 * 將陣列分塊
 *
 * @param array - 要分塊的陣列
 * @param size - 每塊的大小
 * @returns 分塊後的二維陣列
 *
 * @example
 * chunk([1, 2, 3, 4, 5], 2)
 * // [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0')
  }

  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
