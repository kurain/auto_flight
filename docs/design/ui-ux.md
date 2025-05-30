# UI/UX設計

## 1. ユーザーインターフェース構成

### 1.1 画面レイアウト
```
┌─────────────────────────────────────────┐
│  [≡] [▶/❚❚] [🎥] [⚙] [⛶]              │  ← コントロールバー
├─────────────────────────────────────────┤
│                                         │
│                                         │
│           3Dビューポート                │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ FPS: 60 | Missiles: 24 | Time: 00:45   │  ← ステータスバー
└─────────────────────────────────────────┘
```

### 1.2 コントロール要素
```typescript
interface UIControls {
  // メインコントロール
  mainControls: {
    menuButton: Button;       // ハンバーガーメニュー
    playPauseButton: Button;  // 再生/一時停止
    cameraButton: Button;     // カメラモード切替
    settingsButton: Button;   // 設定
    fullscreenButton: Button; // フルスクリーン
  };
  
  // ステータス表示
  statusBar: {
    fps: TextDisplay;
    missileCount: TextDisplay;
    elapsedTime: TextDisplay;
  };
  
  // 非表示可能
  autoHide: boolean;          // 3秒後に自動非表示
  opacity: number;            // 0.8
}
```

## 2. カメラコントロール

### 2.1 カメラモード切替UI
```typescript
interface CameraModeUI {
  // モード選択
  modes: [
    { icon: '🎯', name: 'Chase',     key: '1' },
    { icon: '🌍', name: 'Orbit',     key: '2' },
    { icon: '🎬', name: 'Cinematic', key: '3' },
    { icon: '📍', name: 'Fixed',     key: '4' },
  ];
  
  // 表示方法
  display: 'dropdown' | 'radial' | 'linear';
  
  // トランジション
  transition: {
    duration: 1.0;            // 秒
    easing: 'easeInOutCubic';
  };
}
```

### 2.2 インタラクティブカメラ
```typescript
interface InteractiveCamera {
  // マウス操作（オービットモード時）
  mouseControl: {
    rotate: 'leftButton';
    pan: 'middleButton';
    zoom: 'wheel';
    sensitivity: {
      rotate: 0.5;
      pan: 0.3;
      zoom: 0.1;
    };
  };
  
  // タッチ操作
  touchControl: {
    rotate: 'oneFingerDrag';
    zoom: 'pinch';
    pan: 'twoFingerDrag';
  };
  
  // 制限
  limits: {
    minDistance: 10;
    maxDistance: 500;
    minPolarAngle: 0;         // ラジアン
    maxPolarAngle: Math.PI;
  };
}
```

## 3. 設定メニュー

### 3.1 グラフィック設定
```typescript
interface GraphicsSettings {
  // プリセット
  qualityPresets: [
    { name: 'Low',    value: 0 },
    { name: 'Medium', value: 1 },
    { name: 'High',   value: 2 },
    { name: 'Ultra',  value: 3 },
    { name: 'Custom', value: -1 }
  ];
  
  // 詳細設定
  advanced: {
    resolution: Slider;        // 50% - 200%
    antialiasing: Toggle;      // FXAA/MSAA
    shadows: Dropdown;         // Off/Low/High
    particleDensity: Slider;   // 0% - 100%
    postProcessing: Toggle;
    vsync: Toggle;
  };
}
```

### 3.2 オーディオ設定（将来実装）
```typescript
interface AudioSettings {
  masterVolume: Slider;        // 0-100
  effectsVolume: Slider;       // 0-100
  musicVolume: Slider;         // 0-100
  mute: Toggle;
}
```

### 3.3 アクセシビリティ
```typescript
interface AccessibilitySettings {
  // 視覚
  colorBlindMode: Dropdown;    // None/Protanopia/Deuteranopia
  highContrast: Toggle;
  reduceMotion: Toggle;
  
  // 操作
  cameraShake: Toggle;
  autoPlay: Toggle;
  
  // UI
  uiScale: Slider;             // 80% - 150%
  fontSize: Slider;            // Small/Normal/Large
}
```

## 4. オンボーディング

### 4.1 初回起動時
```typescript
interface OnboardingFlow {
  // ウェルカム画面
  welcome: {
    title: "板野フライトへようこそ";
    description: "美しい弾幕を楽しむ観賞用シミュレーター";
    startButton: "体験を始める";
  };
  
  // 簡易チュートリアル
  tutorial: [
    {
      target: 'playButton',
      message: 'ここをクリックして演出を開始',
      position: 'bottom'
    },
    {
      target: 'cameraButton',
      message: 'カメラアングルを切り替え',
      position: 'bottom'
    },
    {
      target: 'viewport',
      message: 'マウスドラッグで視点を回転',
      position: 'center'
    }
  ];
  
  // スキップ可能
  skipButton: boolean;
}
```

### 4.2 ツールチップ
```typescript
interface TooltipSystem {
  // ホバー時表示
  tooltips: Map<string, {
    text: string;
    delay: number;             // ミリ秒
    position: 'top' | 'bottom' | 'left' | 'right';
  }>;
  
  // 例
  examples: {
    playButton: "スペースキーでも再生/停止",
    cameraButton: "1-4キーでモード切替",
    fullscreenButton: "F11キーでも切替可能"
  };
}
```

## 5. レスポンシブデザイン

### 5.1 画面サイズ対応
```typescript
interface ResponsiveLayout {
  // ブレークポイント
  breakpoints: {
    mobile: 768;               // px以下
    tablet: 1024;              // px以下
    desktop: 1025;             // px以上
  };
  
  // モバイル最適化
  mobile: {
    controls: 'bottom';        // 下部に配置
    buttonSize: 'large';       // 48px以上
    gestures: 'enabled';       // ジェスチャー操作
    orientation: 'landscape';  // 横向き推奨
  };
  
  // タブレット
  tablet: {
    controls: 'adaptive';      // 状況に応じて配置
    dualTouch: true;          // 2本指操作対応
  };
}
```

### 5.2 タッチ操作
```typescript
interface TouchInterface {
  // ジェスチャー
  gestures: {
    tap: 'togglePlayPause';
    doubleTap: 'toggleFullscreen';
    swipeLeft: 'nextCamera';
    swipeRight: 'previousCamera';
    longPress: 'showMenu';
  };
  
  // フィードバック
  hapticFeedback: boolean;     // 振動フィードバック
  
  // UI調整
  touchTargetSize: 44;         // 最小タッチ領域（px）
}
```

## 6. ビジュアルデザイン

### 6.1 デザイントークン
```typescript
interface DesignTokens {
  // カラー
  colors: {
    primary: '#0066CC';        // ブルー
    secondary: '#FF6B35';      // オレンジ
    background: '#000000E6';   // 半透明黒
    text: '#FFFFFF';
    textSecondary: '#CCCCCC';
  };
  
  // タイポグラフィ
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif';
    sizes: {
      small: '12px';
      normal: '14px';
      large: '16px';
      heading: '20px';
    };
  };
  
  // スペーシング
  spacing: {
    xs: '4px';
    sm: '8px';
    md: '16px';
    lg: '24px';
    xl: '32px';
  };
  
  // アニメーション
  animation: {
    duration: {
      fast: '200ms';
      normal: '300ms';
      slow: '500ms';
    };
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)';
  };
}
```

### 6.2 UIコンポーネントスタイル
```css
/* ボタンスタイル */
.button {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 16px;
  transition: all 0.2s ease;
}

.button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

/* グラスモーフィズムパネル */
.panel {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

## 7. パフォーマンス表示

### 7.1 デバッグオーバーレイ
```typescript
interface DebugOverlay {
  // 表示項目
  metrics: {
    fps: {
      current: number;
      average: number;
      min: number;
      graph: boolean;          // 60秒間のグラフ
    };
    
    memory: {
      used: number;            // MB
      allocated: number;       // MB
    };
    
    rendering: {
      drawCalls: number;
      triangles: number;
      particles: number;
    };
  };
  
  // 表示切替
  toggleKey: 'F3';
  position: 'topRight';
  transparency: 0.8;
}
```

### 7.2 パフォーマンス警告
```typescript
interface PerformanceWarning {
  // FPS低下警告
  lowFpsThreshold: 30;
  warningMessage: "パフォーマンス低下を検出しました";
  
  // 自動品質調整
  autoAdjust: {
    enabled: boolean;
    message: "グラフィック品質を自動調整しています";
  };
}
```