import { encode as encodePNG } from 'fast-png'
import { encode as encodeJPEG } from 'jpeg-js'
import { createNoise2D } from 'simplex-noise'

export interface GridPoint {
  colorIndex: number  // 0-2 (3色のうちどの色を使うか)
  influence: number   // 0.0-1.0 (影響度)
}

export interface MeshGradientOptions {
  width: number
  height: number
  colors: [string, string, string]  // 3つの色
  grid: GridPoint[][]  // 6x4のグリッド
  displacement?: {
    enabled: boolean
    frequency: number   // 周波数（低いほど大きな歪み）
    amplitude: number   // 振幅（歪みの強さ）
    seed?: number       // ノイズのシード値
  }
  grain?: {
    enabled: boolean
    intensity: number   // グレインの強さ (0.0-1.0)
  }
}

/**
 * メッシュグラデーション画像をJPEGで生成
 * グリッドサイズ: 6x4 (横6列、縦4行)
 * ピクセルシェーダー方式: 各ピクセルの色を計算
 */
export function generateMeshGradientJPEG(options: MeshGradientOptions, quality = 85): Uint8Array {
  const { width, height, colors, grid, displacement, grain } = options

  const timings: Record<string, number> = {}
  let startTime = performance.now()

  // グリッドサイズの検証
  if (!grid || grid.length !== 4 || grid.some(row => !row || row.length !== 6)) {
    console.error('Invalid grid:', grid)
    throw new Error('Grid must be 6x4 (6 columns, 4 rows)')
  }

  // 3色をRGBに変換
  const palette: RGB[] = colors.map(hexToRgb)
  timings.setup = performance.now() - startTime

  // ノイズマップの事前計算（低解像度）
  startTime = performance.now()
  const noiseScale = 4 // 1/4解像度でノイズマップを生成
  const noiseWidth = Math.ceil(width / noiseScale)
  const noiseHeight = Math.ceil(height / noiseScale)

  let displacementMapX: Float32Array | null = null
  let displacementMapY: Float32Array | null = null
  if (displacement?.enabled) {
    const noise2D = createNoise2D()
    displacementMapX = new Float32Array(noiseWidth * noiseHeight)
    displacementMapY = new Float32Array(noiseHeight * noiseWidth)

    for (let y = 0; y < noiseHeight; y++) {
      for (let x = 0; x < noiseWidth; x++) {
        const realX = x * noiseScale
        const realY = y * noiseScale
        const idx = y * noiseWidth + x
        displacementMapX[idx] = noise2D(realX * displacement.frequency, realY * displacement.frequency)
        displacementMapY[idx] = noise2D((realX + 1000) * displacement.frequency, (realY + 1000) * displacement.frequency)
      }
    }
  }

  timings.noiseInit = performance.now() - startTime

  // ピクセルデータを作成 (RGBA)
  const data = new Uint8Array(width * height * 4)

  startTime = performance.now()
  let displacementTime = 0
  let colorCalcTime = 0
  let grainTime = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sampleX = x
      let sampleY = y

      // ディスプレイスメントマップを適用（低解像度マップから補間）
      if (displacement?.enabled && displacementMapX && displacementMapY) {
        const dispStart = performance.now()
        const noiseX = sampleNoiseMap(displacementMapX, x, y, noiseWidth, noiseHeight, noiseScale)
        const noiseY = sampleNoiseMap(displacementMapY, x, y, noiseWidth, noiseHeight, noiseScale)

        sampleX = x + noiseX * displacement.amplitude
        sampleY = y + noiseY * displacement.amplitude

        // 範囲外にならないようクランプ
        sampleX = Math.max(0, Math.min(width - 1, sampleX))
        sampleY = Math.max(0, Math.min(height - 1, sampleY))
        displacementTime += performance.now() - dispStart
      }

      const colorStart = performance.now()
      const color = getPixelColor(sampleX, sampleY, width, height, grid, palette)
      colorCalcTime += performance.now() - colorStart

      // グレインテクスチャを適用（高速ハッシュノイズ）
      let r = color.r
      let g = color.g
      let b = color.b

      if (grain?.enabled) {
        const grainStart = performance.now()
        const grainValue = fastNoise(x, y) * grain.intensity * 255
        r = Math.max(0, Math.min(255, r + grainValue))
        g = Math.max(0, Math.min(255, g + grainValue))
        b = Math.max(0, Math.min(255, b + grainValue))
        grainTime += performance.now() - grainStart
      }

      const index = (y * width + x) * 4
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = 255 // アルファ値は常に不透明
    }
  }
  timings.pixelLoop = performance.now() - startTime
  timings.displacement = displacementTime
  timings.colorCalc = colorCalcTime
  timings.grain = grainTime

  // JPEGにエンコード (RGBAからRGBに変換)
  startTime = performance.now()
  const rgbData = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgbData[i * 4] = data[i * 4]     // R
    rgbData[i * 4 + 1] = data[i * 4 + 1] // G
    rgbData[i * 4 + 2] = data[i * 4 + 2] // B
    rgbData[i * 4 + 3] = 255         // A (JPEG用に必須)
  }

  const result = encodeJPEG({
    width,
    height,
    data: rgbData,
    quality
  }, quality).data
  timings.jpegEncode = performance.now() - startTime

  console.log('=== Performance Breakdown ===')
  console.log(`Setup: ${timings.setup.toFixed(2)}ms`)
  console.log(`Noise Init: ${timings.noiseInit.toFixed(2)}ms`)
  console.log(`Pixel Loop Total: ${timings.pixelLoop.toFixed(2)}ms`)
  console.log(`  - Displacement: ${timings.displacement.toFixed(2)}ms`)
  console.log(`  - Color Calc: ${timings.colorCalc.toFixed(2)}ms`)
  console.log(`  - Grain: ${timings.grain.toFixed(2)}ms`)
  console.log(`JPEG Encode: ${timings.jpegEncode.toFixed(2)}ms`)
  console.log(`Total: ${Object.values(timings).reduce((a, b) => a + b, 0).toFixed(2)}ms`)

  return result
}

/**
 * 高速ハッシュベースのノイズ関数（グレイン用）
 * -1.0 から 1.0 の範囲の値を返す
 */
function fastNoise(x: number, y: number): number {
  // 整数座標に変換
  const ix = Math.floor(x * 0.5) // 0.5をかけて少し滑らかに
  const iy = Math.floor(y * 0.5)

  // ハッシュ関数（整数のみの演算で高速）
  let hash = ix * 374761393 + iy * 668265263
  hash = (hash ^ (hash >>> 13)) * 1274126177
  hash = hash ^ (hash >>> 16)

  // -1.0 から 1.0 の範囲に正規化
  return ((hash & 0x7FFFFFFF) / 0x7FFFFFFF) * 2.0 - 1.0
}

/**
 * 低解像度ノイズマップから値をバイリニア補間でサンプリング
 */
function sampleNoiseMap(
  noiseMap: Float32Array,
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  scale: number
): number {
  // ノイズマップ座標に変換
  const mapX = x / scale
  const mapY = y / scale

  // グリッド位置
  const x0 = Math.floor(mapX)
  const y0 = Math.floor(mapY)
  const x1 = Math.min(x0 + 1, mapWidth - 1)
  const y1 = Math.min(y0 + 1, mapHeight - 1)

  // 補間係数
  const tx = mapX - x0
  const ty = mapY - y0

  // 4点の値を取得
  const v00 = noiseMap[y0 * mapWidth + x0]
  const v10 = noiseMap[y0 * mapWidth + x1]
  const v01 = noiseMap[y1 * mapWidth + x0]
  const v11 = noiseMap[y1 * mapWidth + x1]

  // バイリニア補間
  const v0 = v00 + (v10 - v00) * tx
  const v1 = v01 + (v11 - v01) * tx
  return v0 + (v1 - v0) * ty
}

/**
 * 特定位置のピクセルの色を計算（ピクセルシェーダー）
 */
function getPixelColor(
  x: number,
  y: number,
  width: number,
  height: number,
  grid: GridPoint[][],
  palette: RGB[]
): RGB {
  // グリッド座標を計算 (0.0 - 5.0, 0.0 - 3.0)
  const gridX = (x / (width - 1)) * 5
  const gridY = (y / (height - 1)) * 3

  // グリッドのセル位置
  const cellX = Math.min(Math.floor(gridX), 4) // 0-4
  const cellY = Math.min(Math.floor(gridY), 2) // 0-2

  // セル内の相対位置 (0.0 - 1.0)
  const tx = gridX - cellX
  const ty = gridY - cellY

  // 4つの角のグリッドポイントを取得
  const topLeft = grid[cellY][cellX]
  const topRight = grid[cellY][cellX + 1]
  const bottomLeft = grid[cellY + 1][cellX]
  const bottomRight = grid[cellY + 1][cellX + 1]

  // 各ポイントの色を影響度で調整
  const topLeftColor = blendColorWithInfluence(palette[topLeft.colorIndex], topLeft.influence)
  const topRightColor = blendColorWithInfluence(palette[topRight.colorIndex], topRight.influence)
  const bottomLeftColor = blendColorWithInfluence(palette[bottomLeft.colorIndex], bottomLeft.influence)
  const bottomRightColor = blendColorWithInfluence(palette[bottomRight.colorIndex], bottomRight.influence)

  // バイリニア補間
  return bilinearInterpolate(topLeftColor, topRightColor, bottomLeftColor, bottomRightColor, tx, ty)
}

/**
 * 色を影響度で調整（影響度が低いと白に近づく）
 */
function blendColorWithInfluence(color: RGB, influence: number): RGB {
  const white: RGB = { r: 255, g: 255, b: 255 }
  return interpolateColor(white, color, influence)
}

/**
 * バイリニア補間
 */
function bilinearInterpolate(
  topLeft: RGB,
  topRight: RGB,
  bottomLeft: RGB,
  bottomRight: RGB,
  tx: number,
  ty: number
): RGB {
  // 上辺を補間
  const top = interpolateColor(topLeft, topRight, tx)
  // 下辺を補間
  const bottom = interpolateColor(bottomLeft, bottomRight, tx)
  // 縦方向に補間
  return interpolateColor(top, bottom, ty)
}

/**
 * 2つの色を補間
 */
function interpolateColor(color1: RGB, color2: RGB, t: number): RGB {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * t),
    g: Math.round(color1.g + (color2.g - color1.g) * t),
    b: Math.round(color1.b + (color2.b - color1.b) * t)
  }
}

interface RGB {
  r: number
  g: number
  b: number
}

/**
 * HEXカラーコードをRGBに変換
 */
function hexToRgb(hex: string): RGB {
  // #を削除
  hex = hex.replace(/^#/, '')

  // 3桁の場合は6桁に展開
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('')
  }

  const num = parseInt(hex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}
