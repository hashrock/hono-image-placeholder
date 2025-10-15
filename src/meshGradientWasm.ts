import { encode } from 'fast-png'

export interface MeshGradientWasmOptions {
  width: number
  height: number
  colors: [string, string, string]  // 3つの色
  grain?: {
    enabled: boolean
    intensity: number   // グレインの強さ (0.0-1.0)
  }
}

/**
 * WASM版メッシュグラデーション画像をPNGで生成
 * 簡略版: グリッドやディスプレイスメントは未実装、単色+グレインのみ
 */
export async function generateMeshGradientPNGWasm(
  wasmModule: WebAssembly.Module,
  options: MeshGradientWasmOptions
): Promise<Uint8Array> {
  const { width, height, colors, grain } = options

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

  // グレイン強度
  const grainIntensity = grain?.enabled ? grain.intensity : 0.0

  // メモリバッファを割り当て
  const bufferSize = width * height * 4
  const bufferPtr = exports.allocateBuffer(bufferSize)

  console.log(`WASM buffer allocated at: ${bufferPtr}, size: ${bufferSize}`)

  // WASM関数を呼び出して画像を生成
  exports.generateImage(width, height, color0, color1, color2, grainIntensity)

  // WASMメモリからピクセルデータを取得
  const memory = exports.memory as WebAssembly.Memory
  const data = new Uint8Array(memory.buffer, bufferPtr, bufferSize)

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
