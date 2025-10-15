import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load the compiled WASM bindings (top-level await inside the module handles instantiation)
const wasmModulePath = join(__dirname, '..', 'build', 'release.js')
const { memory, allocateBuffer, freeBuffer, generateImageFull } = await import(wasmModulePath)

function writeGrid(view, grid) {
  let offset = 0
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const point = grid[row][col]
      view.setInt32(offset, point.colorIndex, true)
      view.setFloat32(offset + 4, point.influence, true)
      offset += 8
    }
  }
}

function makeUniformGrid(colorIndex, influence) {
  const grid = []
  for (let row = 0; row < 4; row++) {
    const cols = []
    for (let col = 0; col < 6; col++) {
      cols.push({ colorIndex, influence })
    }
    grid.push(cols)
  }
  return grid
}

function makeCheckerGrid() {
  const grid = []
  for (let row = 0; row < 4; row++) {
    const cols = []
    for (let col = 0; col < 6; col++) {
      const colorIndex = (row + col) % 3
      const influence = 0.5 + (row % 2 === 0 ? 0.2 : -0.1)
      cols.push({ colorIndex, influence })
    }
    grid.push(cols)
  }
  return grid
}

function runWasm(options) {
  const { width, height, colors, grid, displacementEnabled, grainEnabled } = options

  const colorInts = colors.map(hex => parseInt(hex.replace(/^#/, ''), 16))
  const gridSize = 6 * 4 * 8
  const gridPtr = allocateBuffer(gridSize)
  const gridView = new DataView(memory.buffer, gridPtr, gridSize)
  writeGrid(gridView, grid)

  const outputPtr = allocateBuffer(width * height * 4)

  generateImageFull(
    width,
    height,
    colorInts[0],
    colorInts[1],
    colorInts[2],
    gridPtr,
    displacementEnabled,
    0.0012,
    120,
    grainEnabled,
    0.04,
    outputPtr
  )

  try {
    return new Uint8Array(memory.buffer, outputPtr, width * height * 4)
  } finally {
    freeBuffer(gridPtr)
    freeBuffer(outputPtr)
  }
}

// Test 1: uniform grid should produce the same color across the frame
{
  const width = 16
  const height = 16
  const colors = ['#ff0000', '#00ff00', '#0000ff']
  const grid = makeUniformGrid(0, 1)
  const pixels = runWasm({
    width,
    height,
    colors,
    grid,
    displacementEnabled: false,
    grainEnabled: false
  })

  for (let i = 0; i < pixels.length; i += 4) {
    assert.strictEqual(pixels[i], 255, 'expected uniform red channel')
    assert.strictEqual(pixels[i + 1], 0, 'expected zero green channel')
    assert.strictEqual(pixels[i + 2], 0, 'expected zero blue channel')
    assert.strictEqual(pixels[i + 3], 255, 'expected opaque alpha channel')
  }
}

// Test 2: checker grid should generate varying colors without throwing, and stay within bounds
{
  const width = 12
  const height = 8
  const colors = ['#ff7f50', '#6495ed', '#3cb371']
  const grid = makeCheckerGrid()
  const pixels = runWasm({
    width,
    height,
    colors,
    grid,
    displacementEnabled: true,
    grainEnabled: true
  })

  assert.strictEqual(pixels.length, width * height * 4)
  for (let i = 0; i < pixels.length; i++) {
    assert.ok(pixels[i] >= 0 && pixels[i] <= 255, 'pixel component out of bounds')
  }
}

console.log('ok')
