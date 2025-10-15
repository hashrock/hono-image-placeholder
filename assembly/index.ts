// メッシュグラデーション生成（AssemblyScript完全版）

@inline
function hashNoise(x: i32, y: i32): f32 {
  let hash = x * 374761393 + y * 668265263;
  hash = (hash ^ (hash >>> 13)) * 1274126177;
  hash = hash ^ (hash >>> 16);
  return (f32(hash & 0x7FFFFFFF) / f32(0x7FFFFFFF)) * 2.0 - 1.0;
}

// 滑らかな値ノイズ（バイリニア補間 + スムースステップ）
@inline
function smoothNoise(x: f32, y: f32): f32 {
  const xi: i32 = i32(Mathf.floor(x));
  const yi: i32 = i32(Mathf.floor(y));

  const xf: f32 = x - f32(xi);
  const yf: f32 = y - f32(yi);

  const topLeft = hashNoise(xi, yi);
  const topRight = hashNoise(xi + 1, yi);
  const bottomLeft = hashNoise(xi, yi + 1);
  const bottomRight = hashNoise(xi + 1, yi + 1);

  const u = xf * xf * (3.0 - 2.0 * xf);
  const v = yf * yf * (3.0 - 2.0 * yf);

  const top = topLeft + (topRight - topLeft) * u;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * u;

  return top + (bottom - top) * v;
}

// 高速ハッシュノイズ（グレイン用）
function fastNoise(x: f32, y: f32): f32 {
  const ix = i32(x * 0.5);
  const iy = i32(y * 0.5);

  let hash = ix * 374761393 + iy * 668265263;
  hash = (hash ^ (hash >>> 13)) * 1274126177;
  hash = hash ^ (hash >>> 16);

  return (f32(hash & 0x7FFFFFFF) / f32(0x7FFFFFFF)) * 2.0 - 1.0;
}

// グリッドデータから色を取得するヘルパー
@inline
function readCornerColor(
  ptr: usize,
  palette0R: f32, palette0G: f32, palette0B: f32,
  palette1R: f32, palette1G: f32, palette1B: f32,
  palette2R: f32, palette2G: f32, palette2B: f32,
  out: StaticArray<f32>
): void {
  const colorIndex = load<i32>(ptr);
  const influence = load<f32>(ptr + 4);

  let baseR: f32;
  let baseG: f32;
  let baseB: f32;

  if (colorIndex == 0) {
    baseR = palette0R; baseG = palette0G; baseB = palette0B;
  } else if (colorIndex == 1) {
    baseR = palette1R; baseG = palette1G; baseB = palette1B;
  } else {
    baseR = palette2R; baseG = palette2G; baseB = palette2B;
  }

  // 影響度が低いほど白へ近づける
  const invInfluence = <f32>1.0 - influence;
  const white: f32 = <f32>255.0;
  unchecked(out[0] = baseR * influence + white * invInfluence);
  unchecked(out[1] = baseG * influence + white * invInfluence);
  unchecked(out[2] = baseB * influence + white * invInfluence);
}

// メインの画像生成関数（完全版）
export function generateImageFull(
  width: i32,
  height: i32,
  color0: u32,
  color1: u32,
  color2: u32,
  gridPtr: usize,  // グリッドデータへのポインタ
  gridCols: i32,   // グリッド列数
  gridRows: i32,   // グリッド行数
  displacementEnabled: bool,
  displacementFreq: f32,
  displacementAmp: f32,
  grainEnabled: bool,
  grainIntensity: f32,
  outputPtr: usize  // 出力バッファへのポインタ
): void {
  const palette0R = f32((color0 >> 16) & 0xFF);
  const palette0G = f32((color0 >> 8) & 0xFF);
  const palette0B = f32(color0 & 0xFF);

  const palette1R = f32((color1 >> 16) & 0xFF);
  const palette1G = f32((color1 >> 8) & 0xFF);
  const palette1B = f32(color1 & 0xFF);

  const palette2R = f32((color2 >> 16) & 0xFF);
  const palette2G = f32((color2 >> 8) & 0xFF);
  const palette2B = f32(color2 & 0xFF);

  // 再利用するカラー配列
  const tlColor = new StaticArray<f32>(3);
  const trColor = new StaticArray<f32>(3);
  const blColor = new StaticArray<f32>(3);
  const brColor = new StaticArray<f32>(3);

  const invWidth: f32 = <f32>1.0 / f32(width - 1);
  const invHeight: f32 = <f32>1.0 / f32(height - 1);

  for (let y: i32 = 0; y < height; y++) {
    for (let x: i32 = 0; x < width; x++) {
      let sampleX: f32 = f32(x);
      let sampleY: f32 = f32(y);

      // ディスプレイスメントマップを適用
      if (displacementEnabled) {
        const noiseX = smoothNoise(sampleX * displacementFreq, sampleY * displacementFreq);
        const noiseY = smoothNoise((sampleX + 1000.0) * displacementFreq, (sampleY + 1000.0) * displacementFreq);

        sampleX = sampleX + noiseX * displacementAmp;
        sampleY = sampleY + noiseY * displacementAmp;

        // 範囲外にならないようクランプ
        sampleX = max(0.0, min(f32(width - 1), sampleX));
        sampleY = max(0.0, min(f32(height - 1), sampleY));
      }

      // グリッド座標を計算 (0.0 - (gridCols-1), 0.0 - (gridRows-1))
      const maxGridX = f32(gridCols - 1);
      const maxGridY = f32(gridRows - 1);
      const gridX: f32 = f32(sampleX * invWidth * maxGridX);
      const gridY: f32 = f32(sampleY * invHeight * maxGridY);

      // グリッドのセル位置
      let cellX: i32 = i32(Mathf.floor(gridX));
      let cellY: i32 = i32(Mathf.floor(gridY));

      if (cellX >= gridCols - 1) cellX = gridCols - 2;
      if (cellY >= gridRows - 1) cellY = gridRows - 2;

      const tx: f32 = gridX - f32(cellX);
      const ty: f32 = gridY - f32(cellY);

      const topLeftPtr: usize = gridPtr + usize(((cellY * gridCols) + cellX) << 3);
      const topRightPtr: usize = gridPtr + usize(((cellY * gridCols) + (cellX + 1)) << 3);
      const bottomLeftPtr: usize = gridPtr + usize((((cellY + 1) * gridCols) + cellX) << 3);
      const bottomRightPtr: usize = gridPtr + usize((((cellY + 1) * gridCols) + (cellX + 1)) << 3);

      readCornerColor(topLeftPtr,
        palette0R, palette0G, palette0B,
        palette1R, palette1G, palette1B,
        palette2R, palette2G, palette2B,
        tlColor);
      readCornerColor(topRightPtr,
        palette0R, palette0G, palette0B,
        palette1R, palette1G, palette1B,
        palette2R, palette2G, palette2B,
        trColor);
      readCornerColor(bottomLeftPtr,
        palette0R, palette0G, palette0B,
        palette1R, palette1G, palette1B,
        palette2R, palette2G, palette2B,
        blColor);
      readCornerColor(bottomRightPtr,
        palette0R, palette0G, palette0B,
        palette1R, palette1G, palette1B,
        palette2R, palette2G, palette2B,
        brColor);

      const tlR = unchecked(tlColor[0]);
      const tlG = unchecked(tlColor[1]);
      const tlB = unchecked(tlColor[2]);

      const trR = unchecked(trColor[0]);
      const trG = unchecked(trColor[1]);
      const trB = unchecked(trColor[2]);

      const blR = unchecked(blColor[0]);
      const blG = unchecked(blColor[1]);
      const blB = unchecked(blColor[2]);

      const brR = unchecked(brColor[0]);
      const brG = unchecked(brColor[1]);
      const brB = unchecked(brColor[2]);

      // バイリニア補間
      const topR = tlR + (trR - tlR) * tx;
      const topG = tlG + (trG - tlG) * tx;
      const topB = tlB + (trB - tlB) * tx;

      const bottomR = blR + (brR - blR) * tx;
      const bottomG = blG + (brG - blG) * tx;
      const bottomB = blB + (brB - blB) * tx;

      let finalR = topR + (bottomR - topR) * ty;
      let finalG = topG + (bottomG - topG) * ty;
      let finalB = topB + (bottomB - topB) * ty;

      // グレインテクスチャを適用
      if (grainEnabled) {
        const grainValue = fastNoise(f32(x), f32(y)) * grainIntensity * 255.0;
        finalR = finalR + grainValue;
        finalG = finalG + grainValue;
        finalB = finalB + grainValue;
      }

      // クランプして書き込み
      const index: usize = outputPtr + usize((y * width + x) * 4);
      store<u8>(index, u8(max(0.0, min(255.0, finalR))));
      store<u8>(index + 1, u8(max(0.0, min(255.0, finalG))));
      store<u8>(index + 2, u8(max(0.0, min(255.0, finalB))));
      store<u8>(index + 3, 255);
    }
  }
}

// メモリ割り当て用のヘルパー
export function allocateBuffer(size: i32): usize {
  return __pin(__new(size, 0));
}

export function freeBuffer(ptr: usize): void {
  __unpin(ptr);
}
