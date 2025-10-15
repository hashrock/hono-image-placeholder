import { Hono } from 'hono'
import { generateMeshGradientPNG } from './meshGradient'
import { generateCacheKey, getCachedImage, setCachedImage } from './cache'

type Bindings = CloudflareBindings

const app = new Hono<{ Bindings: Bindings }>()

import type { GridPoint } from './meshGradient'

// デフォルト3色パレット（近い色相）
const DEFAULT_PALETTE: [string, string, string] = ['#667eea', '#764ba2', '#8b5cf6']

// デフォルトグリッド（6x4）
const DEFAULT_GRID: GridPoint[][] = [
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

app.get('/', (c) => {
  return c.text('Image Placeholder Service\n\nUsage:\n/image?colors=...  - Generate image\n/editor - Visual editor')
})

// エディタUI
app.get('/editor', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Placeholder Editor</title>
  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8f8f8;
      --bg-page: #f5f5f5;
      --text-primary: #333;
      --text-secondary: #666;
      --border: #ddd;
    }

    [data-theme="dark"] {
      --bg-primary: #1e1e1e;
      --bg-secondary: #2a2a2a;
      --bg-page: #121212;
      --text-primary: #e0e0e0;
      --text-secondary: #a0a0a0;
      --border: #444;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      background: var(--bg-page);
      color: var(--text-primary);
      transition: background-color 0.3s, color 0.3s;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: var(--bg-primary);
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h1 {
      margin-bottom: 20px;
      color: var(--text-primary);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 30px;
    }

    .color-input {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .color-input input[type="color"] {
      width: 100%;
      height: 60px;
      border: 2px solid var(--border);
      border-radius: 4px;
      cursor: pointer;
    }

    .color-input input[type="text"] {
      width: 100%;
      padding: 5px;
      font-family: monospace;
      font-size: 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      text-align: center;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .preview {
      margin-bottom: 20px;
    }

    .preview img {
      width: 100%;
      max-width: 800px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    button {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    button:hover {
      background: #5568d3;
    }

    .url-output {
      margin-top: 20px;
      padding: 15px;
      background: var(--bg-secondary);
      border-radius: 4px;
      word-break: break-all;
    }

    .url-output input {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .label {
      font-size: 11px;
      color: var(--text-secondary);
      text-align: center;
    }

    #generationTime {
      margin-top: 10px;
      font-size: 14px;
      color: var(--text-secondary);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>メッシュグラデーション エディタ</h1>

    <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 4px;">
      <h3 style="margin-bottom: 10px;">カラーパレット（3色）</h3>

      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">プリセット</label>
        <select id="presetSelector" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
          <option value="default">デフォルト</option>
          <option value="dark">ダーク</option>
          <option value="light">ライト</option>
          <option value="watercolor">水彩</option>
          <option value="sunset">サンセット</option>
          <option value="forest">フォレスト</option>
          <option value="purple">パープル</option>
          <option value="ocean">オーシャン</option>
          <option value="warm">ウォーム</option>
          <option value="cool">クール</option>
          <option value="pastel">パステル</option>
          <option value="neon">ネオン</option>
        </select>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <div style="flex: 1;">
          <label>色1</label>
          <input type="color" id="palette0" value="#667eea" style="width: 100%; height: 50px; border: 2px solid var(--border); border-radius: 4px; cursor: pointer;">
        </div>
        <div style="flex: 1;">
          <label>色2</label>
          <input type="color" id="palette1" value="#764ba2" style="width: 100%; height: 50px; border: 2px solid var(--border); border-radius: 4px; cursor: pointer;">
        </div>
        <div style="flex: 1;">
          <label>色3</label>
          <input type="color" id="palette2" value="#8b5cf6" style="width: 100%; height: 50px; border: 2px solid var(--border); border-radius: 4px; cursor: pointer;">
        </div>
      </div>
      <button onclick="randomizePalette()" style="width: 100%;">パレットをランダム化</button>
    </div>

    <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 4px;">
      <h3 style="margin-bottom: 10px;">ディスプレイスメント（歪み）</h3>
      <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <input type="checkbox" id="displacementEnabled" checked>
        有効化
      </label>
      <div style="margin-bottom: 10px;">
        <label>周波数（低いほど大きな歪み）</label>
        <input type="range" id="frequency" min="0.0001" max="0.01" step="0.0001" value="0.0012" style="width: 100%;">
        <div id="freqLabel" style="font-size: 12px; color: var(--text-secondary);">0.0012</div>
      </div>
      <div>
        <label>振幅（歪みの強さ）</label>
        <input type="range" id="amplitude" min="0" max="200" step="5" value="125" style="width: 100%;">
        <div id="ampLabel" style="font-size: 12px; color: var(--text-secondary);">125</div>
      </div>
    </div>

    <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 4px;">
      <h3 style="margin-bottom: 10px;">グレイン（ざらざら感）</h3>
      <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <input type="checkbox" id="grainEnabled" checked>
        有効化
      </label>
      <div>
        <label>強さ</label>
        <input type="range" id="grainIntensity" min="0" max="0.5" step="0.01" value="0.15" style="width: 100%;">
        <div id="grainLabel" style="font-size: 12px; color: var(--text-secondary);">0.15</div>
      </div>
    </div>

    <div class="controls">
      <button onclick="updatePreview()">プレビュー更新</button>
      <button onclick="copyUrl()">URLをコピー</button>
      <button onclick="randomColors()">ランダムグリッド</button>
      <button onclick="toggleDarkMode()" id="darkModeBtn">ダークモード</button>
    </div>

    <div class="preview">
      <img id="preview" src="/image" alt="Preview">
    </div>

    <div id="generationTime"></div>

    <div class="grid" id="colorGrid"></div>

    <div class="url-output">
      <h3 style="margin-bottom: 10px;">生成URL</h3>
      <input type="text" id="urlOutput" readonly>
    </div>
  </div>

  <script>
    // カラーパレットプリセット（色とランダム生成ルール）
    const palettePresets = {
      default: {
        colors: ['#667eea', '#764ba2', '#8b5cf6'],
        generate: () => {
          const baseHue = Math.random() * 360;
          return [
            hslToHex(baseHue, 70, 60),
            hslToHex((baseHue + 30) % 360, 70, 55),
            hslToHex((baseHue + 60) % 360, 70, 65)
          ];
        }
      },
      dark: {
        colors: ['#1a1a2e', '#16213e', '#0f3460'],
        generate: () => {
          const baseHue = Math.random() * 360;
          return [
            hslToHex(baseHue, 30, 12),
            hslToHex((baseHue + 20) % 360, 40, 15),
            hslToHex((baseHue + 40) % 360, 50, 20)
          ];
        }
      },
      light: {
        colors: ['#f8f9fa', '#e9ecef', '#dee2e6'],
        generate: () => {
          const baseHue = Math.random() * 360;
          return [
            hslToHex(baseHue, 10, 97),
            hslToHex((baseHue + 15) % 360, 12, 92),
            hslToHex((baseHue + 30) % 360, 15, 87)
          ];
        }
      },
      watercolor: {
        colors: ['#a8dadc', '#457b9d', '#1d3557'],
        generate: () => {
          const baseHue = 180 + (Math.random() - 0.5) * 60; // 青系
          return [
            hslToHex(baseHue, 40, 75),
            hslToHex(baseHue + 10, 45, 50),
            hslToHex(baseHue + 20, 55, 25)
          ];
        }
      },
      sunset: {
        colors: ['#ff6b6b', '#ee5a6f', '#c44569'],
        generate: () => {
          const baseHue = 340 + Math.random() * 40; // 赤・ピンク系
          return [
            hslToHex(baseHue % 360, 100, 70),
            hslToHex((baseHue + 10) % 360, 80, 65),
            hslToHex((baseHue + 20) % 360, 60, 55)
          ];
        }
      },
      forest: {
        colors: ['#2d6a4f', '#40916c', '#52b788'],
        generate: () => {
          const baseHue = 120 + (Math.random() - 0.5) * 40; // 緑系
          return [
            hslToHex(baseHue, 45, 30),
            hslToHex(baseHue + 10, 50, 40),
            hslToHex(baseHue + 20, 55, 50)
          ];
        }
      },
      purple: {
        colors: ['#7209b7', '#560bad', '#3c096c'],
        generate: () => {
          const baseHue = 270 + (Math.random() - 0.5) * 40; // 紫系
          return [
            hslToHex(baseHue, 90, 38),
            hslToHex(baseHue + 5, 90, 35),
            hslToHex(baseHue + 10, 90, 24)
          ];
        }
      },
      ocean: {
        colors: ['#0077b6', '#0096c7', '#00b4d8'],
        generate: () => {
          const baseHue = 190 + (Math.random() - 0.5) * 30; // 青系
          return [
            hslToHex(baseHue, 100, 36),
            hslToHex(baseHue + 5, 100, 39),
            hslToHex(baseHue + 10, 100, 43)
          ];
        }
      },
      warm: {
        colors: ['#ffb703', '#fb8500', '#ff006e'],
        generate: () => {
          const baseHue = 30 + Math.random() * 30; // オレンジ・黄色系
          return [
            hslToHex(baseHue, 100, 51),
            hslToHex((baseHue - 10 + 360) % 360, 100, 49),
            hslToHex((baseHue + 300) % 360, 100, 50)
          ];
        }
      },
      cool: {
        colors: ['#4cc9f0', '#4361ee', '#7209b7'],
        generate: () => {
          const baseHue = 180 + Math.random() * 100; // 青・紫系
          return [
            hslToHex(baseHue, 85, 62),
            hslToHex((baseHue + 30) % 360, 80, 60),
            hslToHex((baseHue + 60) % 360, 90, 38)
          ];
        }
      },
      pastel: {
        colors: ['#ffc8dd', '#ffafcc', '#bde0fe'],
        generate: () => {
          const baseHue = Math.random() * 360;
          return [
            hslToHex(baseHue, 100, 90),
            hslToHex((baseHue + 30) % 360, 100, 85),
            hslToHex((baseHue + 60) % 360, 100, 87)
          ];
        }
      },
      neon: {
        colors: ['#08ffc8', '#00f5ff', '#7b2cbf'],
        generate: () => {
          const baseHue = Math.random() * 360;
          return [
            hslToHex(baseHue, 100, 52),
            hslToHex((baseHue + 120) % 360, 100, 50),
            hslToHex((baseHue + 240) % 360, 80, 47)
          ];
        }
      }
    };

    // 3色パレット
    const palette = [...palettePresets.default.colors];

    // グリッド（6x4）
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
    ];

    // カラーグリッドを初期化
    function initColorGrid() {
      const gridElement = document.getElementById('colorGrid');
      gridElement.innerHTML = '';

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          const div = document.createElement('div');
          div.className = 'color-input';

          // 色選択（0-2）
          const colorSelect = document.createElement('select');
          colorSelect.style.width = '100%';
          colorSelect.style.padding = '5px';
          colorSelect.style.marginBottom = '5px';
          for (let i = 0; i < 3; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = \`色\${i + 1}\`;
            option.style.background = palette[i];
            option.style.color = 'white';
            if (i === grid[row][col].colorIndex) {
              option.selected = true;
            }
            colorSelect.appendChild(option);
          }
          colorSelect.addEventListener('change', (e) => {
            grid[row][col].colorIndex = parseInt(e.target.value);
          });

          // 影響度スライダー
          const influenceSlider = document.createElement('input');
          influenceSlider.type = 'range';
          influenceSlider.min = '0';
          influenceSlider.max = '100';
          influenceSlider.value = (grid[row][col].influence * 100).toString();
          influenceSlider.style.width = '100%';
          influenceSlider.addEventListener('input', (e) => {
            grid[row][col].influence = parseInt(e.target.value) / 100;
            influenceLabel.textContent = \`影響度: \${(grid[row][col].influence * 100).toFixed(0)}%\`;
          });

          const influenceLabel = document.createElement('div');
          influenceLabel.className = 'label';
          influenceLabel.textContent = \`影響度: \${(grid[row][col].influence * 100).toFixed(0)}%\`;

          const posLabel = document.createElement('div');
          posLabel.className = 'label';
          posLabel.textContent = \`[\${row},\${col}]\`;

          div.appendChild(colorSelect);
          div.appendChild(influenceSlider);
          div.appendChild(influenceLabel);
          div.appendChild(posLabel);
          gridElement.appendChild(div);
        }
      }
    }

    // URLを生成
    function generateUrl() {
      const params = new URLSearchParams();
      params.set('color0', palette[0]);
      params.set('color1', palette[1]);
      params.set('color2', palette[2]);

      const displacementEnabled = document.getElementById('displacementEnabled').checked;
      const frequency = document.getElementById('frequency').value;
      const amplitude = document.getElementById('amplitude').value;

      params.set('displacement', displacementEnabled.toString());
      params.set('freq', frequency);
      params.set('amp', amplitude);

      const grainEnabled = document.getElementById('grainEnabled').checked;
      const grainIntensity = document.getElementById('grainIntensity').value;

      params.set('grain', grainEnabled.toString());
      params.set('grainIntensity', grainIntensity);

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          params.set(\`g_\${row}_\${col}_c\`, grid[row][col].colorIndex.toString());
          params.set(\`g_\${row}_\${col}_i\`, grid[row][col].influence.toString());
        }
      }
      return \`\${location.origin}/image?\${params.toString()}\`;
    }

    // プレビューを更新
    function updatePreview() {
      const startTime = performance.now();
      const url = generateUrl();
      const img = document.getElementById('preview');

      img.onload = () => {
        const endTime = performance.now();
        const loadTime = (endTime - startTime).toFixed(2);
        document.getElementById('generationTime').textContent = \`生成時間: \${loadTime}ms\`;
      };

      img.src = url;
      document.getElementById('urlOutput').value = url;
    }

    // パレットをランダム化
    function randomizePalette() {
      // 現在選択されているプリセットの生成ルールを使用
      const presetName = document.getElementById('presetSelector').value;
      const preset = palettePresets[presetName];

      if (preset && preset.generate) {
        const newColors = preset.generate();
        palette[0] = newColors[0];
        palette[1] = newColors[1];
        palette[2] = newColors[2];

        document.getElementById('palette0').value = palette[0];
        document.getElementById('palette1').value = palette[1];
        document.getElementById('palette2').value = palette[2];

        initColorGrid();
        updatePreview();
      }
    }

    // HSLからHEXに変換
    function hslToHex(h, s, l) {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return \`#\${f(0)}\${f(8)}\${f(4)}\`;
    }

    // ダークモード切り替え
    function toggleDarkMode() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      document.getElementById('darkModeBtn').textContent = newTheme === 'dark' ? 'ライトモード' : 'ダークモード';
      localStorage.setItem('theme', newTheme);
    }

    // URLをコピー
    function copyUrl() {
      const urlOutput = document.getElementById('urlOutput');
      urlOutput.select();
      document.execCommand('copy');
      alert('URLをコピーしました！');
    }

    // ランダムなグリッドを生成
    function randomColors() {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          grid[row][col].colorIndex = Math.floor(Math.random() * 3);
          grid[row][col].influence = Math.random() * 0.5 + 0.5; // 0.5-1.0
        }
      }
      initColorGrid();
      updatePreview();
    }

    // プリセット選択
    document.getElementById('presetSelector').addEventListener('change', (e) => {
      const presetName = e.target.value;
      const preset = palettePresets[presetName];
      if (preset) {
        palette[0] = preset.colors[0];
        palette[1] = preset.colors[1];
        palette[2] = preset.colors[2];

        document.getElementById('palette0').value = palette[0];
        document.getElementById('palette1').value = palette[1];
        document.getElementById('palette2').value = palette[2];

        initColorGrid();
        updatePreview();
      }
    });

    // パレットカラー変更イベント
    document.getElementById('palette0').addEventListener('input', (e) => {
      palette[0] = e.target.value;
      initColorGrid();
    });
    document.getElementById('palette1').addEventListener('input', (e) => {
      palette[1] = e.target.value;
      initColorGrid();
    });
    document.getElementById('palette2').addEventListener('input', (e) => {
      palette[2] = e.target.value;
      initColorGrid();
    });

    // ディスプレイスメント設定の監視
    document.getElementById('frequency').addEventListener('input', (e) => {
      document.getElementById('freqLabel').textContent = e.target.value;
    });
    document.getElementById('amplitude').addEventListener('input', (e) => {
      document.getElementById('ampLabel').textContent = e.target.value;
    });

    // グレイン設定の監視
    document.getElementById('grainIntensity').addEventListener('input', (e) => {
      document.getElementById('grainLabel').textContent = e.target.value;
    });

    // 初期化
    initColorGrid();
    updatePreview();

    // ダークモードの初期化
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('darkModeBtn').textContent = savedTheme === 'dark' ? 'ライトモード' : 'ダークモード';
  </script>
</body>
</html>
  `)
})

// 画像生成エンドポイント
app.get('/image', async (c) => {
  const bucket = c.env.IMAGE_CACHE

  // URLパラメータを取得
  const params = c.req.query()
  const width = parseInt(params.width || '1920')
  const height = parseInt(params.height || '1080')

  // 3色パレットを解析
  const colors: [string, string, string] = [
    params.color0 || DEFAULT_PALETTE[0],
    params.color1 || DEFAULT_PALETTE[1],
    params.color2 || DEFAULT_PALETTE[2]
  ]

  // ディスプレイスメント設定
  const displacement = {
    enabled: params.displacement !== 'false', // デフォルトON
    frequency: parseFloat(params.freq || '0.0012'),
    amplitude: parseFloat(params.amp || '125')
  }

  // グレイン設定
  const grain = {
    enabled: params.grain !== 'false', // デフォルトON
    intensity: parseFloat(params.grainIntensity || '0.15')
  }

  // グリッドを解析（g_0_0_c=0&g_0_0_i=0.8 の形式）
  const grid: GridPoint[][] = []
  for (let row = 0; row < 4; row++) {
    grid[row] = []
    for (let col = 0; col < 6; col++) {
      const colorIndexKey = `g_${row}_${col}_c`
      const influenceKey = `g_${row}_${col}_i`

      const defaultPoint = DEFAULT_GRID[row][col]
      grid[row][col] = {
        colorIndex: parseInt(params[colorIndexKey] || defaultPoint.colorIndex.toString()),
        influence: parseFloat(params[influenceKey] || defaultPoint.influence.toString())
      }
    }
  }

  // キャッシュキーを生成
  const searchParams = new URLSearchParams()
  searchParams.set('width', width.toString())
  searchParams.set('height', height.toString())
  searchParams.set('color0', colors[0])
  searchParams.set('color1', colors[1])
  searchParams.set('color2', colors[2])
  searchParams.set('displacement', displacement.enabled.toString())
  searchParams.set('freq', displacement.frequency.toString())
  searchParams.set('amp', displacement.amplitude.toString())
  searchParams.set('grain', grain.enabled.toString())
  searchParams.set('grainIntensity', grain.intensity.toString())
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      searchParams.set(`g_${row}_${col}_c`, grid[row][col].colorIndex.toString())
      searchParams.set(`g_${row}_${col}_i`, grid[row][col].influence.toString())
    }
  }
  const cacheKey = generateCacheKey(searchParams)

  // キャッシュをチェック
  const cached = await getCachedImage(bucket, cacheKey)
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  }

  // PNG画像を生成
  try {
    const pngBuffer = generateMeshGradientPNG({
      width,
      height,
      colors,
      grid,
      displacement: displacement.enabled ? displacement : undefined,
      grain: grain.enabled ? grain : undefined
    })

    // R2にキャッシュ
    await setCachedImage(bucket, cacheKey, Buffer.from(pngBuffer))

    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error) {
    console.error('Error generating image:', error)
    return c.text('Error generating image', 500)
  }
})

export default app
