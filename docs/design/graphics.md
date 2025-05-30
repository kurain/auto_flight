# グラフィックス・エフェクト設計

## 1. レンダリングパイプライン

### 1.1 基本構成
```typescript
interface RenderPipeline {
  // メインパス
  geometryPass: GeometryRenderer;      // 3Dモデル描画
  particlePass: ParticleRenderer;      // パーティクル描画
  
  // ポストプロセス
  bloomPass: BloomEffect;              // 光源の輝き
  motionBlurPass: MotionBlurEffect;   // モーションブラー
  
  // 最終合成
  compositor: Compositor;
}
```

### 1.2 描画順序
1. スカイボックス
2. 地形（存在する場合）
3. 戦闘機
4. ミサイル
5. 煙の軌跡（加算合成）
6. 爆発エフェクト（加算合成）
7. UI要素

## 2. 3Dモデル表現

### 2.1 戦闘機モデル
```typescript
interface AircraftVisual {
  // ジオメトリ
  mesh: {
    vertices: 10000;          // 頂点数上限
    material: PBRMaterial;    // 物理ベースマテリアル
  };
  
  // ディテール
  details: {
    panelLines: boolean;      // パネルライン
    rivets: boolean;          // リベット（ノーマルマップ）
    weathering: boolean;      // 汚れ・風化
  };
  
  // アニメーション要素
  movingParts: {
    canopy: Mesh;
    landingGear: Mesh[];
    controlSurfaces: {
      ailerons: Mesh[];
      elevators: Mesh[];
      rudder: Mesh;
    };
  };
}
```

### 2.2 ミサイルモデル
```typescript
interface MissileVisual {
  // 本体
  body: {
    geometry: CylinderGeometry;
    material: MetallicMaterial;
  };
  
  // 炎エフェクト
  exhaust: {
    innerFlame: Mesh;         // 青白い中心炎
    outerFlame: Mesh;         // オレンジの外炎
    heatDistortion: boolean;  // 熱による歪み効果
  };
}
```

## 3. パーティクルエフェクト

### 3.1 煙の軌跡
```typescript
interface SmokeTrailVisual {
  // パーティクル設定
  particle: {
    texture: Texture;         // 煙のテクスチャ
    blendMode: 'additive' | 'alpha';
    
    // カラーグラデーション
    colorCurve: {
      start: Color;           // 白（RGB: 255,255,255）
      mid: Color;             // 薄灰色（RGB: 200,200,200）
      end: Color;             // 透明灰色（RGB: 150,150,150）
    };
    
    // サイズカーブ
    sizeCurve: AnimationCurve;
    
    // 透明度カーブ
    alphaCurve: AnimationCurve;
  };
  
  // 最適化
  pooling: {
    maxParticles: 10000;
    recycleThreshold: 0.01;   // アルファ値
  };
}
```

### 3.2 爆発エフェクト
```typescript
interface ExplosionVisual {
  // 多層構造
  layers: {
    // 中心の閃光
    flash: {
      duration: 0.1;
      intensity: 10.0;
      color: Color;           // 白
    };
    
    // 火球
    fireball: {
      expansionSpeed: 50;     // m/s
      maxRadius: 15;          // m
      texture: Texture;       // 炎のテクスチャ
      animationFrames: 16;
    };
    
    // 衝撃波
    shockwave: {
      speed: 340;             // 音速
      thickness: 2;           // m
      opacity: 0.3;
      distortion: boolean;
    };
    
    // 煙
    smoke: {
      delay: 0.3;             // 秒
      particleCount: 100;
      riseSpeed: 5;           // m/s
    };
  };
  
  // 破片
  debris: {
    count: 30;
    meshPool: Mesh[];         // 再利用可能な破片メッシュ
    trailEffect: boolean;     // 火花の尾
  };
}
```

## 4. ライティング

### 4.1 環境光設定
```typescript
interface LightingSetup {
  // 主光源（太陽）
  sunLight: {
    direction: Vector3;       // 上方45度
    intensity: 1.0;
    color: Color;            // 暖色（5500K）
    shadows: {
      enabled: boolean;
      resolution: 2048;
      cascade: 3;            // カスケードシャドウマップ
    };
  };
  
  // 環境光
  ambientLight: {
    skyColor: Color;         // 青空色
    groundColor: Color;      // 地面反射色
    intensity: 0.4;
  };
  
  // 補助光
  fillLight: {
    direction: Vector3;      // カメラ方向
    intensity: 0.2;
    color: Color;           // 寒色
  };
}
```

### 4.2 特殊ライティング
```typescript
interface SpecialLighting {
  // ミサイルの炎
  missileGlow: {
    pointLight: {
      intensity: 2.0;
      color: Color;          // オレンジ
      range: 10;
      decay: 2;
    };
  };
  
  // 爆発の光
  explosionLight: {
    intensity: AnimationCurve; // 時間による減衰
    maxIntensity: 50.0;
    color: Color;             // 黄白色
    range: 50;
  };
}
```

## 5. シェーダー

### 5.1 カスタムシェーダー
```glsl
// 煙の軌跡シェーダー（頂点）
attribute float age;
varying float vAge;
varying vec2 vUv;

void main() {
  vAge = age;
  vUv = uv;
  
  // ビルボード効果
  vec3 cameraRight = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);
  vec3 cameraUp = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);
  
  vec3 pos = position.x * cameraRight + position.y * cameraUp;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

// 煙の軌跡シェーダー（フラグメント）
uniform sampler2D smokeTexture;
uniform vec3 smokeColor;
varying float vAge;
varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(smokeTexture, vUv);
  
  // 年齢による透明度
  float alpha = texColor.a * (1.0 - vAge);
  
  // 色の調整
  vec3 color = mix(smokeColor, vec3(0.5), vAge);
  
  gl_FragColor = vec4(color, alpha);
}
```

### 5.2 ポストエフェクトシェーダー
```glsl
// ブルームエフェクト
uniform sampler2D sceneTexture;
uniform sampler2D bloomTexture;
uniform float bloomIntensity;

void main() {
  vec4 scene = texture2D(sceneTexture, vUv);
  vec4 bloom = texture2D(bloomTexture, vUv);
  
  // 加算合成
  vec3 color = scene.rgb + bloom.rgb * bloomIntensity;
  
  // トーンマッピング
  color = color / (1.0 + color);
  
  gl_FragColor = vec4(color, 1.0);
}
```

## 6. 最適化技術

### 6.1 LOD（Level of Detail）
```typescript
interface LODSystem {
  // 戦闘機LOD
  aircraftLODs: [
    { distance: 0,    polygons: 10000 },  // 高品質
    { distance: 100,  polygons: 5000 },   // 中品質
    { distance: 500,  polygons: 1000 },   // 低品質
    { distance: 1000, polygons: 200 }     // 最低品質
  ];
  
  // パーティクルLOD
  particleLODs: [
    { distance: 0,   density: 1.0 },      // 100%
    { distance: 100, density: 0.7 },      // 70%
    { distance: 300, density: 0.3 },      // 30%
    { distance: 500, density: 0.1 }       // 10%
  ];
}
```

### 6.2 カリング
```typescript
interface CullingSystem {
  // フラスタムカリング
  frustumCulling: boolean;
  
  // オクルージョンカリング
  occlusionCulling: {
    enabled: boolean;
    queryObjects: number;     // 最大クエリ数
  };
  
  // 距離カリング
  distanceCulling: {
    maxDistance: 2000;        // メートル
    fadeDistance: 100;        // フェード開始距離
  };
}
```

## 7. アートディレクション

### 7.1 ビジュアルスタイル
- **リアリスティック**: 実在の戦闘機に基づく
- **スタイライズド**: アニメ調の誇張表現
- **カラーパレット**: 青空、白煙、オレンジ炎を基調

### 7.2 カメラエフェクト
```typescript
interface CameraEffects {
  // 被写界深度
  depthOfField: {
    enabled: boolean;
    focusDistance: number;
    aperture: number;
    maxBlur: number;
  };
  
  // レンズフレア
  lensFlare: {
    enabled: boolean;
    sunFlare: boolean;
    explosionFlare: boolean;
  };
  
  // 色調補正
  colorGrading: {
    contrast: 1.1;
    saturation: 1.2;
    brightness: 1.0;
  };
}
```