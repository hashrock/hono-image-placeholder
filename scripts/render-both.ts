import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateMeshGradientPNG } from '../src/meshGradient'
import { generateMeshGradientPNGWasm } from '../src/meshGradientWasm'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const fixtureUrl = new URL('../tests/fixtures/basic.json', import.meta.url)
  const options = JSON.parse(await readFile(fixtureUrl, 'utf8'))

  const outDir = resolve(__dirname, '../tmp')
  await mkdir(outDir, { recursive: true })

  const jsPng = generateMeshGradientPNG(options)
  await writeFile(resolve(outDir, 'js.png'), jsPng)

  const wasmBinary = await readFile(new URL('../build/release.wasm', import.meta.url))
  const wasmModule = await WebAssembly.compile(wasmBinary)
  const wasmPng = await generateMeshGradientPNGWasm(wasmModule, options)
  await writeFile(resolve(outDir, 'wasm.png'), wasmPng)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
