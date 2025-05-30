# 物理シミュレーション設計

## 1. 飛行力学

### 1.1 戦闘機の物理モデル
```typescript
interface AircraftPhysics {
  // 基本パラメータ
  mass: number;              // 15,000 kg
  dragCoefficient: number;   // 0.021
  liftCoefficient: number;   // 1.2
  
  // 推力
  thrust: Vector3;           // 最大 150kN
  
  // 空力中心
  centerOfLift: Vector3;
  centerOfPressure: Vector3;
}
```

### 1.2 簡易飛行モデル
```typescript
// 毎フレームの更新
function updateAircraft(dt: number) {
  // 推力
  const thrust = aircraft.throttle * MAX_THRUST;
  
  // 抗力（簡易計算）
  const drag = velocity.lengthSq() * DRAG_COEFFICIENT;
  
  // 揚力（迎角に依存）
  const lift = velocity.length() * angleOfAttack * LIFT_COEFFICIENT;
  
  // 加速度
  const acceleration = (thrust - drag) / mass;
  
  // 速度更新
  velocity.add(acceleration * dt);
  
  // 位置更新
  position.add(velocity * dt);
}
```

### 1.3 姿勢制御
```typescript
interface AttitudeControl {
  // オイラー角
  pitch: number;    // ピッチ（-90 to 90度）
  roll: number;     // ロール（-180 to 180度）
  yaw: number;      // ヨー（0 to 360度）
  
  // 角速度
  pitchRate: number;  // 最大 120度/秒
  rollRate: number;   // 最大 360度/秒
  yawRate: number;    // 最大 60度/秒
  
  // 安定性
  stability: number;  // 0.0-1.0
}
```

## 2. ミサイル物理

### 2.1 推進システム
```typescript
interface MissilePhysics {
  // 燃焼段階
  boostPhase: {
    duration: number;      // 2秒
    thrust: number;        // 50kN
    fuelConsumption: number;
  };
  
  sustainPhase: {
    duration: number;      // 6秒
    thrust: number;        // 10kN
  };
  
  // 空力特性
  dragProfile: DragCurve;
}
```

### 2.2 誘導制御
```typescript
// 比例航法アルゴリズム
function proportionalNavigation(
  missile: Missile,
  target: Aircraft,
  navigationConstant: number = 3
): Vector3 {
  // 視線ベクトル
  const los = target.position.sub(missile.position);
  
  // 視線角速度
  const omega = los.cross(target.velocity.sub(missile.velocity));
  
  // 加速度指令
  const command = omega.multiplyScalar(navigationConstant);
  
  // 制限
  return command.clampLength(0, MAX_ACCELERATION);
}
```

### 2.3 軌跡予測
```typescript
interface TrajectoryPrediction {
  // 未来位置予測
  predictPosition(time: number): Vector3;
  
  // 衝突予測
  predictImpact(target: Aircraft): {
    willHit: boolean;
    timeToImpact: number;
    missDistance: number;
  };
}
```

## 3. 煙の軌跡物理

### 3.1 パーティクルシステム
```typescript
interface SmokeTrail {
  // パーティクル生成
  emissionRate: number;      // 100個/秒
  initialVelocity: Vector3;  // ミサイル速度の0.8倍
  
  // パーティクル特性
  lifetime: number;          // 3-5秒
  size: {
    initial: number;         // 0.5m
    final: number;          // 3.0m
  };
  
  // 物理影響
  gravity: number;          // -0.5 m/s²
  windEffect: Vector3;      // 風の影響
  turbulence: number;       // 乱流強度
}
```

### 3.2 煙の拡散モデル
```typescript
function updateSmokeParticle(particle: SmokeParticle, dt: number) {
  // 重力
  particle.velocity.y -= GRAVITY * dt;
  
  // 空気抵抗
  const drag = particle.velocity.multiplyScalar(-DRAG_COEFFICIENT);
  particle.velocity.add(drag.multiplyScalar(dt));
  
  // 乱流
  const turbulence = new Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).multiplyScalar(TURBULENCE_STRENGTH);
  
  particle.velocity.add(turbulence.multiplyScalar(dt));
  
  // サイズ増加
  particle.size += EXPANSION_RATE * dt;
  
  // 透明度減少
  particle.opacity -= FADE_RATE * dt;
}
```

## 4. 爆発物理

### 4.1 爆発モデル
```typescript
interface ExplosionPhysics {
  // 初期パラメータ
  blastRadius: number;       // 20m
  peakPressure: number;      // 1000 kPa
  
  // 拡張速度
  shockwaveVelocity: number; // 340 m/s
  fireballExpansion: number; // 50 m/s
  
  // 持続時間
  duration: {
    flash: number;           // 0.1秒
    fireball: number;        // 0.5秒
    smoke: number;           // 3.0秒
  };
}
```

### 4.2 破片シミュレーション
```typescript
interface DebrisPhysics {
  // 破片生成
  fragmentCount: number;     // 20-50個
  
  // 初期速度分布
  velocityDistribution: {
    min: number;             // 50 m/s
    max: number;             // 200 m/s
    distribution: 'uniform' | 'gaussian';
  };
  
  // 物理特性
  mass: number;              // 0.1-1.0 kg
  dragCoefficient: number;   // 0.47
}
```

## 5. 環境要因

### 5.1 大気モデル（簡易版）
```typescript
interface Atmosphere {
  // 高度による密度変化
  getDensity(altitude: number): number {
    const seaLevelDensity = 1.225; // kg/m³
    return seaLevelDensity * Math.exp(-altitude / 8000);
  }
  
  // 風
  wind: {
    direction: Vector3;
    speed: number;
    turbulence: number;
  };
}
```

### 5.2 重力と慣性
```typescript
const GRAVITY = 9.81; // m/s²

// 慣性モーメント（簡易計算）
interface InertiaModel {
  // 回転慣性
  angularInertia: Vector3;
  
  // トルク計算
  calculateTorque(force: Vector3, position: Vector3): Vector3;
}
```

## 6. 最適化手法

### 6.1 計算簡略化
- **LOD物理**: 距離に応じて計算精度を変更
- **固定タイムステップ**: 1/60秒で統一
- **空間分割**: オクトツリーによる衝突判定の高速化

### 6.2 近似手法
```typescript
// 高速平方根逆数（Quakeの手法を参考）
function fastInvSqrt(x: number): number {
  const halfX = 0.5 * x;
  let i = new Float32Array(1);
  i[0] = x;
  let j = new Int32Array(i.buffer);
  j[0] = 0x5f3759df - (j[0] >> 1);
  i = new Float32Array(j.buffer);
  const y = i[0];
  return y * (1.5 - halfX * y * y);
}
```