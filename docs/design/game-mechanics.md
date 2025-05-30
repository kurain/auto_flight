# ゲームメカニクス設計

## 1. 演出システム

### 1.1 演出フロー
```
開始
  ↓
戦闘機の登場
  ↓
ミサイル発射開始
  ↓
回避シークエンス（ループ）
  │
  ├─ ミサイル接近検知
  ├─ 回避マニューバ選択
  ├─ マニューバ実行
  └─ ミサイル自爆
  ↓
クライマックス演出
  ↓
終了 or ループ
```

### 1.2 タイミング制御
- **序盤** (0-10秒): 少数のミサイルで基本的な回避
- **中盤** (10-30秒): ミサイル数増加、複雑なマニューバ
- **クライマックス** (30-40秒): 大量のミサイル、連続回避
- **終盤** (40-50秒): 徐々に収束、余韻

## 2. 戦闘機AI

### 2.1 回避アルゴリズム
```typescript
interface EvasionLogic {
  // 脅威度評価
  calculateThreatLevel(missile: Missile): number;
  
  // 最適回避方向の計算
  calculateEvasionVector(threats: Missile[]): Vector3;
  
  // マニューバ選択
  selectManeuver(threatLevel: number): ManeuverType;
}
```

### 2.2 マニューバ詳細

#### バレルロール
- **発動条件**: 側面からの単体ミサイル
- **実行時間**: 1.5秒
- **回転速度**: 360度/秒
- **効果**: 誘導を一時的に混乱

#### 急旋回
- **発動条件**: 前方からの複数ミサイル
- **実行時間**: 2.0秒
- **旋回G**: 9G相当
- **バンク角**: 85度

#### 急上昇/急降下
- **発動条件**: 水平面での包囲
- **実行時間**: 2.5秒
- **上昇角**: 70度
- **速度変化**: -20%

#### インメルマンターン
- **発動条件**: 後方からの追尾
- **実行時間**: 3.0秒
- **高度変化**: +500m
- **方向転換**: 180度

### 2.3 判定システム
```typescript
interface CollisionAvoidance {
  // 予測軌道計算
  predictTrajectory(duration: number): Path;
  
  // 危険度マップ
  dangerZones: Map<Vector3, number>;
  
  // 安全経路探索
  findSafePath(): Path;
}
```

## 3. ミサイルシステム

### 3.1 発射パターン
```typescript
enum LaunchPattern {
  SINGLE,        // 単発
  BURST,         // バースト（3-5発）
  SWARM,         // 群発（10-20発）
  ITANO_CIRCUS,  // 板野サーカス（30発以上）
}
```

### 3.2 追尾アルゴリズム
```typescript
interface MissileGuidance {
  // 比例航法
  proportionalNavigation(target: Aircraft): Vector3;
  
  // 追尾限界
  maxTurnRate: number; // 度/秒
  
  // 燃料残量
  fuel: number; // 秒
  
  // 近接信管
  proximityFuse: number; // メートル
}
```

### 3.3 ミサイル性能パラメータ
- **最高速度**: マッハ2.5
- **旋回性能**: 15G
- **追尾時間**: 8秒
- **自爆距離**: 10m
- **加速度**: 50m/s²

## 4. 演出アルゴリズム

### 4.1 ドラマチック演出
```typescript
interface DramaticEffect {
  // ニアミス演出
  nearMissThreshold: number; // 5m以内
  
  // スローモーション
  slowMotionTrigger: boolean;
  slowMotionDuration: number;
  
  // カメラシェイク
  cameraShakeIntensity: number;
}
```

### 4.2 視覚的バランス
- **画面占有率**: ミサイル軌跡は画面の30-50%
- **密度制御**: 1画面に最大50本の軌跡
- **色彩バランス**: 白煙70%、オレンジ炎20%、青空10%

## 5. 難易度カーブ

### 5.1 自動調整システム
```typescript
interface DifficultyManager {
  // 現在の演出強度
  intensity: number; // 0.0 - 1.0
  
  // 時間経過による変化
  timeBasedCurve: AnimationCurve;
  
  // ミサイル密度
  missileDensity: number;
  
  // 回避成功率（目標）
  targetEvasionRate: number; // 0.95
}
```

### 5.2 パラメータスケーリング
| 時間 | ミサイル数/秒 | 追尾精度 | マニューバ頻度 |
|------|--------------|----------|---------------|
| 0-10s | 0.5 | 60% | 低 |
| 10-20s | 1.0 | 70% | 中 |
| 20-30s | 2.0 | 80% | 高 |
| 30-40s | 3.0 | 85% | 最高 |
| 40s+ | 1.0 | 70% | 中 |