import type { R2Bucket } from '@cloudflare/workers-types'

/**
 * URLパラメータからキャッシュキーを生成
 */
export function generateCacheKey(params: URLSearchParams): string {
  // パラメータをソートして一貫性のあるキーを生成
  const sorted = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const keyString = sorted.map(([k, v]) => `${k}=${v}`).join('&')

  // SHA-256ハッシュを生成（Web Crypto API使用）
  return hashString(keyString)
}

/**
 * 文字列から簡易ハッシュを生成（同期版）
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32ビット整数に変換
  }
  return Math.abs(hash).toString(36) + '-' + str.length
}

/**
 * R2からキャッシュされた画像を取得
 */
export async function getCachedImage(
  bucket: R2Bucket,
  cacheKey: string
): Promise<ArrayBuffer | null> {
  try {
    const object = await bucket.get(cacheKey)
    if (!object) {
      return null
    }
    return await object.arrayBuffer()
  } catch (error) {
    console.error('Error getting cached image:', error)
    return null
  }
}

/**
 * R2に画像をキャッシュ
 */
export async function setCachedImage(
  bucket: R2Bucket,
  cacheKey: string,
  imageBuffer: Buffer
): Promise<void> {
  try {
    await bucket.put(cacheKey, imageBuffer, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000' // 1年間キャッシュ
      }
    })
  } catch (error) {
    console.error('Error caching image:', error)
    // キャッシュ失敗は致命的ではないので続行
  }
}
