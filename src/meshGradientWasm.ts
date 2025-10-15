import { encode } from 'fast-png'
import type { GridPoint } from './meshGradient'

export interface MeshGradientWasmOptions {
  width: number
  height: number
  colors: [string, string, string]  // 3つの色
  grid: GridPoint[][]  // 6x4のグリッド
  displacement?: {
    enabled: boolean
    frequency: number
    amplitude: number
  }
  grain?: {
    enabled: boolean
    intensity: number
  }
}

/**
 * WASM版メッシュグラデーション画像をPNGで生成（完全版）
 */
export async function generateMeshGradientPNGWasm(
  wasmModule: WebAssembly.Module,
  options: MeshGradientWasmOptions
): Promise<Uint8Array> {
  const { width, height, colors, grid, displacement, grain } = options

  const startTime = performance.now()

  // WASM モジュールをインスタンス化
  // AssemblyScriptはenv importを必要とする
  const instance = await WebAssembly.instantiate(wasmModule, {
    env: {
      abort: () => {
        throw new Error('AssemblyScript abort')
      },
      'console.log': (ptr: number) => {
        console.log('WASM log:', ptr)
      },
      seed: () => Math.random()
    }
  })
  const exports = instance.exports as any

  // HEX色を0xRRGGBB形式に変換
  const color0 = hexToInt(colors[0])
  const color1 = hexToInt(colors[1])
  const color2 = hexToInt(colors[2])

  // グリッドデータをWASMメモリに転送
  // グリッド形式: [colorIndex (i32), influence (f32)] × 24ポイント = 192バイト（アライメント考慮）
  const gridSize = 6 * 4 * 8 // 6列 × 4行 × 8バイト/ポイント
  const gridPtr = exports.allocateBuffer(gridSize)
  const memory = exports.memory as WebAssembly.Memory
  const gridView = new DataView(memory.buffer, gridPtr, gridSize)

  let offset = 0
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const point = grid[row][col]
      gridView.setInt32(offset, point.colorIndex, true) // 4バイト
      gridView.setFloat32(offset + 4, point.influence, true) // 4バイト（リトルエンディアン）
      offset += 8
    }
  }

  // 出力バッファを割り当て
  const bufferSize = width * height * 4
  const outputPtr = exports.allocateBuffer(bufferSize)

  console.log(`WASM grid allocated at: ${gridPtr}`)
  console.log(`WASM output buffer allocated at: ${outputPtr}, size: ${bufferSize}`)

  // ディスプレイスメント設定
  const displacementEnabled = displacement?.enabled ?? false
  const displacementFreq = displacement?.frequency ?? 0.0012
  const displacementAmp = displacement?.amplitude ?? 125

  // グレイン設定
  const grainEnabled = grain?.enabled ?? false
  const grainIntensity = grain?.intensity ?? 0.04

  // WASM関数を呼び出して画像を生成
  exports.generateImageFull(
    width,
    height,
    color0,
    color1,
    color2,
    gridPtr,
    displacementEnabled,
    displacementFreq,
    displacementAmp,
    grainEnabled,
    grainIntensity,
    outputPtr
  )

  // WASMメモリからピクセルデータを取得
  const data = new Uint8Array(memory.buffer, outputPtr, bufferSize)

  // データをコピー（メモリが再割り当てされる可能性があるため）
  const pixelData = new Uint8Array(data)

  const wasmTime = performance.now() - startTime
  console.log(`WASM generation time: ${wasmTime.toFixed(2)}ms`)

  // PNGにエンコード
  const encodeStart = performance.now()
  const result = encode({
    width,
    height,
    data: pixelData,
    depth: 8,
    channels: 4
  })
  const encodeTime = performance.now() - encodeStart

  console.log(`PNG encode time: ${encodeTime.toFixed(2)}ms`)
  console.log(`Total time: ${(wasmTime + encodeTime).toFixed(2)}ms`)

  return result
}

/**
 * HEXカラーコードを0xRRGGBB形式の整数に変換
 */
function hexToInt(hex: string): number {
  // #を削除
  hex = hex.replace(/^#/, '')

  // 3桁の場合は6桁に展開
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('')
  }

  return parseInt(hex, 16)
}
