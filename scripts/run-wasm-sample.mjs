import { mkdir, writeFile } from 'node:fs/promises'
import { encode } from 'fast-png'
import { memory, allocateBuffer, freeBuffer, generateImageFull } from '../build/release.js'

const width = 256
const height = 144
const colors = ['#667eea', '#764ba2', '#8b5cf6'].map(hex => parseInt(hex.replace('#', ''), 16))

const grid = [
  [
    { colorIndex: 0, influence: 0.8 },
    { colorIndex: 1, influence: 0.9 },
    { colorIndex: 2, influence: 0.7 },
    { colorIndex: 0, influence: 0.6 },
    { colorIndex: 1, influence: 0.8 },
    { colorIndex: 2, influence: 0.9 }
  ],
  [
    { colorIndex: 1, influence: 0.7 },
    { colorIndex: 2, influence: 0.8 },
    { colorIndex: 0, influence: 0.9 },
    { colorIndex: 1, influence: 0.7 },
    { colorIndex: 2, influence: 0.6 },
    { colorIndex: 0, influence: 0.8 }
  ],
  [
    { colorIndex: 2, influence: 0.9 },
    { colorIndex: 0, influence: 0.7 },
    { colorIndex: 1, influence: 0.8 },
    { colorIndex: 2, influence: 0.9 },
    { colorIndex: 0, influence: 0.7 },
    { colorIndex: 1, influence: 0.6 }
  ],
  [
    { colorIndex: 0, influence: 0.6 },
    { colorIndex: 1, influence: 0.8 },
    { colorIndex: 2, influence: 0.9 },
    { colorIndex: 0, influence: 0.7 },
    { colorIndex: 1, influence: 0.9 },
    { colorIndex: 2, influence: 0.8 }
  ]
]

const gridSize = 6 * 4 * 8
const gridPtr = allocateBuffer(gridSize)
const gridView = new DataView(memory.buffer, gridPtr, gridSize)
let offset = 0
for (const row of grid) {
  for (const point of row) {
    gridView.setInt32(offset, point.colorIndex, true)
    gridView.setFloat32(offset + 4, point.influence, true)
    offset += 8
  }
}

const bufferSize = width * height * 4
const outputPtr = allocateBuffer(bufferSize)

const ensureCapacity = (targetEnd) => {
  const current = memory.buffer.byteLength
  if (targetEnd > current) {
    const pageSize = 64 * 1024
    memory.grow(Math.ceil((targetEnd - current) / pageSize))
  }
}
ensureCapacity(outputPtr + bufferSize)

try {
  await mkdir('tmp', { recursive: true })
  generateImageFull(
    width,
    height,
    colors[0],
    colors[1],
    colors[2],
    gridPtr,
    true,
    0.0012,
    125,
    true,
    0.04,
    outputPtr
  )
  const data = new Uint8Array(memory.buffer, outputPtr, bufferSize)
  const png = encode({
    width,
    height,
    data,
    depth: 8,
    channels: 4
  })
  await writeFile('tmp/sample-direct.png', png)
  console.log('success')
} catch (error) {
  console.error('failed', error)
} finally {
  freeBuffer(gridPtr)
  freeBuffer(outputPtr)
}
