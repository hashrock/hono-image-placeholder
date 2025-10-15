// メッシュグラデーション生成（AssemblyScript）

// 高速ハッシュノイズ（グレイン用）
function fastNoise(x: f32, y: f32): f32 {
  const ix = i32(x * 0.5);
  const iy = i32(y * 0.5);

  let hash = ix * 374761393 + iy * 668265263;
  hash = (hash ^ (hash >>> 13)) * 1274126177;
  hash = hash ^ (hash >>> 16);

  return (f32(hash & 0x7FFFFFFF) / f32(0x7FFFFFFF)) * 2.0 - 1.0;
}

// 色補間
function interpolateColor(r1: f32, g1: f32, b1: f32, r2: f32, g2: f32, b2: f32, t: f32): u32 {
  const r = u8(r1 + (r2 - r1) * t);
  const g = u8(g1 + (g2 - g1) * t);
  const b = u8(b1 + (b2 - b1) * t);
  return (u32(r) << 16) | (u32(g) << 8) | u32(b);
}

// バイリニア補間
function bilinearInterpolate(
  r1: f32, g1: f32, b1: f32,
  r2: f32, g2: f32, b2: f32,
  r3: f32, g3: f32, b3: f32,
  r4: f32, g4: f32, b4: f32,
  tx: f32, ty: f32
): u32 {
  // 上辺
  const topR = r1 + (r2 - r1) * tx;
  const topG = g1 + (g2 - g1) * tx;
  const topB = b1 + (b2 - b1) * tx;

  // 下辺
  const bottomR = r3 + (r4 - r3) * tx;
  const bottomG = g3 + (g4 - g3) * tx;
  const bottomB = b3 + (b4 - b3) * tx;

  // 縦方向
  return interpolateColor(topR, topG, topB, bottomR, bottomG, bottomB, ty);
}

// HEX色をRGBに変換（簡略版）
function hexToRgb(hex: u32): u32 {
  return hex; // RGB packed format: 0xRRGGBB
}

// メインの画像生成関数
export function generateImage(
  width: i32,
  height: i32,
  color0: u32,
  color1: u32,
  color2: u32,
  grainIntensity: f32
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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // グリッド座標を計算
      const gridX = (f32(x) / f32(width - 1)) * 5.0;
      const gridY = (f32(y) / f32(height - 1)) * 3.0;

      const cellX = i32(gridX);
      const cellY = i32(gridY);

      const tx = gridX - f32(cellX);
      const ty = gridY - f32(cellY);

      // 簡略化：中央の色を使用
      const baseR = palette1R;
      const baseG = palette1G;
      const baseB = palette1B;

      // グレインを追加
      const grainValue = fastNoise(f32(x), f32(y)) * grainIntensity * 255.0;

      const finalR = u8(max(0.0, min(255.0, baseR + grainValue)));
      const finalG = u8(max(0.0, min(255.0, baseG + grainValue)));
      const finalB = u8(max(0.0, min(255.0, baseB + grainValue)));

      const index = (y * width + x) * 4;
      store<u8>(index, finalR);
      store<u8>(index + 1, finalG);
      store<u8>(index + 2, finalB);
      store<u8>(index + 3, 255);
    }
  }
}

// メモリ割り当て用のヘルパー
export function allocateBuffer(size: i32): usize {
  return __new(size, 0);
}
