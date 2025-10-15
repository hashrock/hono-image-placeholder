import { encode } from 'fast-png'
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
 * メッシュグラデーション画像をPNGで生成
 * グリッドサイズ: 6x4 (横6列、縦4行)
 * ピクセルシェーダー方式: 各ピクセルの色を計算
 */
export function generateMeshGradientPNG(options: MeshGradientOptions): Uint8Array {
  const { width, height, colors, grid, displacement, grain } = options

  // グリッドサイズの検証
  if (!grid || grid.length !== 4 || grid.some(row => !row || row.length !== 6)) {
    console.error('Invalid grid:', grid)
    throw new Error('Grid must be 6x4 (6 columns, 4 rows)')
  }

  // 3色をRGBに変換
  const palette: RGB[] = colors.map(hexToRgb)

  // ノイズ関数の初期化（ディスプレイスメント用）
  let noise2D: ((x: number, y: number) => number) | null = null
  if (displacement?.enabled) {
    noise2D = createNoise2D()
  }

  // グレイン用の高周波ノイズ
  let grainNoise: ((x: number, y: number) => number) | null = null
  if (grain?.enabled) {
    grainNoise = createNoise2D()
  }

  // ピクセルデータを作成 (RGBA)
  const data = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sampleX = x
      let sampleY = y

      // ディスプレイスメントマップを適用
      if (displacement?.enabled && noise2D) {
        const noiseX = noise2D(x * displacement.frequency, y * displacement.frequency)
        const noiseY = noise2D((x + 1000) * displacement.frequency, (y + 1000) * displacement.frequency)

        sampleX = x + noiseX * displacement.amplitude
        sampleY = y + noiseY * displacement.amplitude

        // 範囲外にならないようクランプ
        sampleX = Math.max(0, Math.min(width - 1, sampleX))
        sampleY = Math.max(0, Math.min(height - 1, sampleY))
      }

      const color = getPixelColor(sampleX, sampleY, width, height, grid, palette)

      // グレインテクスチャを適用
      let r = color.r
      let g = color.g
      let b = color.b

      if (grain?.enabled && grainNoise) {
        // 高周波ノイズでざらざら感を出す
        const grainValue = grainNoise(x * 0.5, y * 0.5) * grain.intensity * 255
        r = Math.max(0, Math.min(255, r + grainValue))
        g = Math.max(0, Math.min(255, g + grainValue))
        b = Math.max(0, Math.min(255, b + grainValue))
      }

      const index = (y * width + x) * 4
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = 255 // アルファ値は常に不透明
    }
  }

  // PNGにエンコード
  return encode({
    width,
    height,
    data,
    depth: 8,
    channels: 4
  })
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
