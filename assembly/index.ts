// メッシュグラデーション生成（AssemblyScript完全版）

// Simplex noise implementation for displacement
class SimplexNoise {
  private grad3: f32[][];
  private perm: u8[];

  constructor() {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];

    // Permutation table
    this.perm = new Array<u8>(512);
    const p: u8[] = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
    ];

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private dot(g: f32[], x: f32, y: f32): f32 {
    return g[0] * x + g[1] * y;
  }

  noise2D(xin: f32, yin: f32): f32 {
    const F2: f32 = 0.5 * (Mathf.sqrt(3.0) - 1.0);
    const G2: f32 = (3.0 - Mathf.sqrt(3.0)) / 6.0;

    const s: f32 = (xin + yin) * F2;
    const i: i32 = i32(Mathf.floor(xin + s));
    const j: i32 = i32(Mathf.floor(yin + s));

    const t: f32 = f32(i + j) * G2;
    const X0: f32 = f32(i) - t;
    const Y0: f32 = f32(j) - t;
    const x0: f32 = xin - X0;
    const y0: f32 = yin - Y0;

    let i1: i32, j1: i32;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1: f32 = x0 - f32(i1) + G2;
    const y1: f32 = y0 - f32(j1) + G2;
    const x2: f32 = x0 - 1.0 + 2.0 * G2;
    const y2: f32 = y0 - 1.0 + 2.0 * G2;

    const ii: i32 = i & 255;
    const jj: i32 = j & 255;
    const gi0: i32 = i32(this.perm[ii + i32(this.perm[jj])]) % 12;
    const gi1: i32 = i32(this.perm[ii + i1 + i32(this.perm[jj + j1])]) % 12;
    const gi2: i32 = i32(this.perm[ii + 1 + i32(this.perm[jj + 1])]) % 12;

    let t0: f32 = 0.5 - x0 * x0 - y0 * y0;
    let n0: f32 = 0.0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }

    let t1: f32 = 0.5 - x1 * x1 - y1 * y1;
    let n1: f32 = 0.0;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }

    let t2: f32 = 0.5 - x2 * x2 - y2 * y2;
    let n2: f32 = 0.0;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }
}

// グローバルなSimplexNoiseインスタンス
let simplexNoise: SimplexNoise | null = null;

// 高速ハッシュノイズ（グレイン用）
function fastNoise(x: f32, y: f32): f32 {
  const ix = i32(x * 0.5);
  const iy = i32(y * 0.5);

  let hash = ix * 374761393 + iy * 668265263;
  hash = (hash ^ (hash >>> 13)) * 1274126177;
  hash = hash ^ (hash >>> 16);

  return (f32(hash & 0x7FFFFFFF) / f32(0x7FFFFFFF)) * 2.0 - 1.0;
}

// RGB色を表すクラス
class RGB {
  constructor(public r: f32, public g: f32, public b: f32) {}
}

// 色補間（2色間）
function lerpColor(r1: f32, g1: f32, b1: f32, r2: f32, g2: f32, b2: f32, t: f32): RGB {
  return new RGB(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t
  );
}

// 色を影響度で調整（影響度が低いと白に近づく）
function blendColorWithInfluence(
  paletteR: f32, paletteG: f32, paletteB: f32,
  influence: f32
): RGB {
  const whiteR: f32 = 255.0;
  const whiteG: f32 = 255.0;
  const whiteB: f32 = 255.0;

  return new RGB(
    whiteR + (paletteR - whiteR) * influence,
    whiteG + (paletteG - whiteG) * influence,
    whiteB + (paletteB - whiteB) * influence
  );
}

// バイリニア補間でピクセル色を計算
function getPixelColor(
  x: i32, y: i32,
  width: i32, height: i32,
  gridPtr: usize,  // グリッドデータへのポインタ
  palette0R: f32, palette0G: f32, palette0B: f32,
  palette1R: f32, palette1G: f32, palette1B: f32,
  palette2R: f32, palette2G: f32, palette2B: f32
): RGB {
  // グリッド座標を計算 (0.0 - 5.0, 0.0 - 3.0)
  const gridX: f32 = (f32(x) / f32(width - 1)) * 5.0;
  const gridY: f32 = (f32(y) / f32(height - 1)) * 3.0;

  // グリッドのセル位置
  let cellX: i32 = i32(gridX);
  let cellY: i32 = i32(gridY);

  // 境界チェック
  if (cellX > 4) cellX = 4;
  if (cellY > 2) cellY = 2;

  // セル内の相対位置 (0.0 - 1.0)
  const tx: f32 = gridX - f32(cellX);
  const ty: f32 = gridY - f32(cellY);

  // 4つの角のグリッドポイントを取得
  // グリッド形式: [colorIndex (i32), influence (f32)] × 24ポイント
  // 6×4 = 24ポイント、各8バイト（アライメントのため）

  const topLeftIdx: usize = gridPtr + usize((cellY * 6 + cellX) * 8);
  const topRightIdx: usize = gridPtr + usize((cellY * 6 + cellX + 1) * 8);
  const bottomLeftIdx: usize = gridPtr + usize(((cellY + 1) * 6 + cellX) * 8);
  const bottomRightIdx: usize = gridPtr + usize(((cellY + 1) * 6 + cellX + 1) * 8);

  const tlColorIndex: i32 = load<i32>(topLeftIdx);
  const tlInfluence: f32 = load<f32>(topLeftIdx + 4);

  const trColorIndex: i32 = load<i32>(topRightIdx);
  const trInfluence: f32 = load<f32>(topRightIdx + 4);

  const blColorIndex: i32 = load<i32>(bottomLeftIdx);
  const blInfluence: f32 = load<f32>(bottomLeftIdx + 4);

  const brColorIndex: i32 = load<i32>(bottomRightIdx);
  const brInfluence: f32 = load<f32>(bottomRightIdx + 4);

  // 各コーナーのパレット色を取得
  let tlR: f32, tlG: f32, tlB: f32;
  if (tlColorIndex == 0) { tlR = palette0R; tlG = palette0G; tlB = palette0B; }
  else if (tlColorIndex == 1) { tlR = palette1R; tlG = palette1G; tlB = palette1B; }
  else { tlR = palette2R; tlG = palette2G; tlB = palette2B; }

  let trR: f32, trG: f32, trB: f32;
  if (trColorIndex == 0) { trR = palette0R; trG = palette0G; trB = palette0B; }
  else if (trColorIndex == 1) { trR = palette1R; trG = palette1G; trB = palette1B; }
  else { trR = palette2R; trG = palette2G; trB = palette2B; }

  let blR: f32, blG: f32, blB: f32;
  if (blColorIndex == 0) { blR = palette0R; blG = palette0G; blB = palette0B; }
  else if (blColorIndex == 1) { blR = palette1R; blG = palette1G; blB = palette1B; }
  else { blR = palette2R; blG = palette2G; blB = palette2B; }

  let brR: f32, brG: f32, brB: f32;
  if (brColorIndex == 0) { brR = palette0R; brG = palette0G; brB = palette0B; }
  else if (brColorIndex == 1) { brR = palette1R; brG = palette1G; brB = palette1B; }
  else { brR = palette2R; brG = palette2G; brB = palette2B; }

  // 影響度を適用
  const tlFinal = blendColorWithInfluence(tlR, tlG, tlB, tlInfluence);
  const trFinal = blendColorWithInfluence(trR, trG, trB, trInfluence);
  const blFinal = blendColorWithInfluence(blR, blG, blB, blInfluence);
  const brFinal = blendColorWithInfluence(brR, brG, brB, brInfluence);

  // バイリニア補間
  // 上辺を補間
  const top = lerpColor(tlFinal.r, tlFinal.g, tlFinal.b, trFinal.r, trFinal.g, trFinal.b, tx);

  // 下辺を補間
  const bottom = lerpColor(blFinal.r, blFinal.g, blFinal.b, brFinal.r, brFinal.g, brFinal.b, tx);

  // 縦方向に補間
  return lerpColor(top.r, top.g, top.b, bottom.r, bottom.g, bottom.b, ty);
}

// メインの画像生成関数（完全版）
export function generateImageFull(
  width: i32,
  height: i32,
  color0: u32,
  color1: u32,
  color2: u32,
  gridPtr: usize,  // グリッドデータへのポインタ
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

  // Simplex noiseを初期化（初回のみ）
  if (displacementEnabled && simplexNoise == null) {
    simplexNoise = new SimplexNoise();
  }

  for (let y: i32 = 0; y < height; y++) {
    for (let x: i32 = 0; x < width; x++) {
      let sampleX: f32 = f32(x);
      let sampleY: f32 = f32(y);

      // ディスプレイスメントマップを適用
      if (displacementEnabled && simplexNoise != null) {
        const noise = simplexNoise as SimplexNoise;
        const noiseX = noise.noise2D(sampleX * displacementFreq, sampleY * displacementFreq);
        const noiseY = noise.noise2D((sampleX + 1000.0) * displacementFreq, (sampleY + 1000.0) * displacementFreq);

        sampleX = sampleX + noiseX * displacementAmp;
        sampleY = sampleY + noiseY * displacementAmp;

        // 範囲外にならないようクランプ
        sampleX = max(0.0, min(f32(width - 1), sampleX));
        sampleY = max(0.0, min(f32(height - 1), sampleY));
      }

      // ピクセル色を計算
      const color = getPixelColor(
        i32(sampleX), i32(sampleY),
        width, height,
        gridPtr,
        palette0R, palette0G, palette0B,
        palette1R, palette1G, palette1B,
        palette2R, palette2G, palette2B
      );

      let finalR = color.r;
      let finalG = color.g;
      let finalB = color.b;

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
  return __new(size, 0);
}
