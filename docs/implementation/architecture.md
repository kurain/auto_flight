# システムアーキテクチャ

## 1. 全体構成

### 1.1 アーキテクチャ概要
```
┌─────────────────────────────────────────────────┐
│                  UI Layer                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Controls │ │  HUD     │ │ Settings │      │
│  └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────┤
│              Application Layer                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Scene   │ │  Camera  │ │  Input   │      │
│  │ Manager  │ │ Director │ │ Handler  │      │
│  └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────┤
│                Core Systems                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Physics  │ │ Particle │ │ Effects  │      │
│  │ Engine   │ │  System  │ │ Manager  │      │
│  └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────┤
│              Rendering Layer                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Three.js │ │ Shaders  │ │   LOD    │      │
│  │ Renderer │ │          │ │ System   │      │
│  └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────┘
```

### 1.2 ディレクトリ構造
```
src/
├── main.ts                 # エントリーポイント
├── core/                   # コアシステム
│   ├── App.ts             # アプリケーション管理
│   ├── EventBus.ts        # イベントシステム
│   └── ResourceManager.ts  # リソース管理
├── entities/              # ゲームエンティティ
│   ├── Aircraft.ts        # 戦闘機
│   ├── Missile.ts         # ミサイル
│   └── Entity.ts          # 基底クラス
├── effects/               # エフェクトシステム
│   ├── SmokeTrail.ts      # 煙の軌跡
│   ├── Explosion.ts       # 爆発
│   └── ParticleSystem.ts  # パーティクル基盤
├── physics/               # 物理エンジン
│   ├── PhysicsWorld.ts    # 物理世界
│   ├── FlightDynamics.ts  # 飛行力学
│   └── Collision.ts       # 衝突判定
├── camera/                # カメラシステム
│   ├── CameraDirector.ts  # カメラ制御
│   ├── CameraMode.ts      # カメラモード
│   └── Transition.ts      # 遷移効果
├── ui/                    # UI コンポーネント
│   ├── ControlPanel.ts    # コントロールパネル
│   ├── SettingsMenu.ts    # 設定メニュー
│   └── HUD.ts            # HUD表示
├── rendering/             # レンダリング
│   ├── Renderer.ts        # レンダラー管理
│   ├── PostProcess.ts     # ポストプロセス
│   └── Shaders.ts         # シェーダー
└── utils/                 # ユーティリティ
    ├── Math.ts            # 数学関数
    ├── Pool.ts            # オブジェクトプール
    └── Performance.ts     # パフォーマンス計測
```

## 2. コアシステム設計

### 2.1 アプリケーション管理
```typescript
// App.ts
export class App {
  private renderer: Renderer;
  private scene: Scene;
  private physics: PhysicsWorld;
  private cameraDirector: CameraDirector;
  private uiManager: UIManager;
  private eventBus: EventBus;
  
  constructor() {
    this.eventBus = new EventBus();
    this.initializeSystems();
  }
  
  private initializeSystems(): void {
    // Three.js初期化
    this.renderer = new Renderer();
    this.scene = new Scene();
    
    // 物理エンジン初期化
    this.physics = new PhysicsWorld();
    
    // カメラシステム
    this.cameraDirector = new CameraDirector(this.scene);
    
    // UI初期化
    this.uiManager = new UIManager(this.eventBus);
  }
  
  public start(): void {
    this.gameLoop();
  }
  
  private gameLoop(): void {
    requestAnimationFrame(() => this.gameLoop());
    
    const deltaTime = this.calculateDeltaTime();
    
    // 更新
    this.physics.update(deltaTime);
    this.scene.update(deltaTime);
    this.cameraDirector.update(deltaTime);
    
    // 描画
    this.renderer.render(this.scene, this.cameraDirector.activeCamera);
  }
}
```

### 2.2 イベントシステム
```typescript
// EventBus.ts
export class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();
  
  public on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }
  
  public off(event: string, handler: EventHandler): void {
    this.events.get(event)?.delete(handler);
  }
  
  public emit(event: string, data?: any): void {
    this.events.get(event)?.forEach(handler => handler(data));
  }
}

// イベント定義
export enum GameEvents {
  MISSILE_LAUNCHED = 'missile_launched',
  MISSILE_EXPLODED = 'missile_exploded',
  MANEUVER_STARTED = 'maneuver_started',
  CAMERA_CHANGED = 'camera_changed',
  PERFORMANCE_WARNING = 'performance_warning'
}
```

### 2.3 リソース管理
```typescript
// ResourceManager.ts
export class ResourceManager {
  private static instance: ResourceManager;
  private loader: GLTFLoader;
  private textureLoader: TextureLoader;
  private cache: Map<string, any> = new Map();
  
  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }
  
  public async loadModel(path: string): Promise<GLTF> {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }
    
    const model = await this.loader.loadAsync(path);
    this.cache.set(path, model);
    return model;
  }
  
  public async loadTexture(path: string): Promise<Texture> {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }
    
    const texture = await this.textureLoader.loadAsync(path);
    this.cache.set(path, texture);
    return texture;
  }
}
```

## 3. エンティティシステム

### 3.1 基底エンティティ
```typescript
// Entity.ts
export abstract class Entity {
  protected mesh: Mesh;
  protected physics: PhysicsBody;
  public position: Vector3;
  public rotation: Quaternion;
  public velocity: Vector3;
  
  constructor() {
    this.position = new Vector3();
    this.rotation = new Quaternion();
    this.velocity = new Vector3();
  }
  
  public abstract update(deltaTime: number): void;
  
  public destroy(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    // 物理ボディの破棄
  }
}
```

### 3.2 戦闘機エンティティ
```typescript
// Aircraft.ts
export class Aircraft extends Entity {
  private flightController: FlightController;
  private maneuverSystem: ManeuverSystem;
  private currentManeuver: Maneuver | null = null;
  
  constructor() {
    super();
    this.flightController = new FlightController(this);
    this.maneuverSystem = new ManeuverSystem();
  }
  
  public update(deltaTime: number): void {
    // 脅威評価
    const threats = this.evaluateThreats();
    
    // マニューバ選択
    if (threats.length > 0 && !this.currentManeuver) {
      this.currentManeuver = this.maneuverSystem.selectManeuver(threats);
      this.currentManeuver.start();
    }
    
    // マニューバ実行
    if (this.currentManeuver) {
      this.currentManeuver.update(deltaTime);
      if (this.currentManeuver.isComplete()) {
        this.currentManeuver = null;
      }
    }
    
    // 飛行制御更新
    this.flightController.update(deltaTime);
    
    // メッシュ更新
    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.rotation);
  }
}
```

## 4. エフェクトシステム

### 4.1 パーティクルシステム基盤
```typescript
// ParticleSystem.ts
export abstract class ParticleSystem {
  protected particles: Particle[] = [];
  protected geometry: BufferGeometry;
  protected material: PointsMaterial;
  protected mesh: Points;
  
  constructor(maxParticles: number) {
    this.initializeGeometry(maxParticles);
  }
  
  protected initializeGeometry(maxParticles: number): void {
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new BufferAttribute(sizes, 1));
  }
  
  public update(deltaTime: number): void {
    // パーティクル更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaTime);
      
      if (particle.isDead()) {
        this.particles.splice(i, 1);
      }
    }
    
    // ジオメトリ更新
    this.updateGeometry();
  }
  
  protected abstract updateGeometry(): void;
}
```

### 4.2 煙の軌跡システム
```typescript
// SmokeTrail.ts
export class SmokeTrail extends ParticleSystem {
  private emitter: Vector3;
  private emissionRate: number = 100;
  private particlePool: ObjectPool<SmokeParticle>;
  
  constructor(emitter: Vector3) {
    super(10000);
    this.emitter = emitter;
    this.particlePool = new ObjectPool(SmokeParticle, 10000);
  }
  
  public emit(position: Vector3, velocity: Vector3): void {
    const particle = this.particlePool.acquire();
    particle.reset(position, velocity);
    this.particles.push(particle);
  }
  
  protected updateGeometry(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;
    
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const i3 = i * 3;
      
      positions[i3] = particle.position.x;
      positions[i3 + 1] = particle.position.y;
      positions[i3 + 2] = particle.position.z;
      
      const color = particle.getColor();
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      sizes[i] = particle.size;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}
```

## 5. カメラシステム

### 5.1 カメラディレクター
```typescript
// CameraDirector.ts
export class CameraDirector {
  private cameras: Map<CameraMode, Camera> = new Map();
  public activeCamera: Camera;
  private transition: CameraTransition | null = null;
  
  constructor(scene: Scene) {
    this.initializeCameras(scene);
  }
  
  private initializeCameras(scene: Scene): void {
    this.cameras.set(CameraMode.CHASE, new ChaseCamera());
    this.cameras.set(CameraMode.ORBIT, new OrbitCamera());
    this.cameras.set(CameraMode.CINEMATIC, new CinematicCamera());
    this.cameras.set(CameraMode.FIXED, new FixedCamera());
    
    this.activeCamera = this.cameras.get(CameraMode.CHASE)!;
  }
  
  public switchCamera(mode: CameraMode, duration: number = 1.0): void {
    const targetCamera = this.cameras.get(mode);
    if (!targetCamera || targetCamera === this.activeCamera) return;
    
    this.transition = new CameraTransition(
      this.activeCamera,
      targetCamera,
      duration
    );
  }
  
  public update(deltaTime: number): void {
    if (this.transition) {
      this.transition.update(deltaTime);
      if (this.transition.isComplete()) {
        this.activeCamera = this.transition.targetCamera;
        this.transition = null;
      }
    } else {
      this.activeCamera.update(deltaTime);
    }
  }
}
```

## 6. 最適化戦略

### 6.1 オブジェクトプール
```typescript
// Pool.ts
export class ObjectPool<T extends Poolable> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  
  constructor(
    factory: new() => T,
    initialSize: number
  ) {
    this.factory = () => new factory();
    this.expand(initialSize);
  }
  
  public acquire(): T {
    if (this.available.length === 0) {
      this.expand(Math.max(10, this.inUse.size * 0.5));
    }
    
    const obj = this.available.pop()!;
    this.inUse.add(obj);
    return obj;
  }
  
  public release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      obj.reset();
      this.available.push(obj);
    }
  }
  
  private expand(count: number): void {
    for (let i = 0; i < count; i++) {
      this.available.push(this.factory());
    }
  }
}
```

### 6.2 LODシステム
```typescript
// LODSystem.ts
export class LODSystem {
  private lodGroups: Map<string, LODGroup> = new Map();
  
  public registerLOD(
    name: string,
    levels: Array<{ distance: number; mesh: Mesh }>
  ): void {
    const group = new LODGroup();
    
    levels.forEach(level => {
      group.addLevel(level.mesh, level.distance);
    });
    
    this.lodGroups.set(name, group);
  }
  
  public update(camera: Camera): void {
    this.lodGroups.forEach(group => {
      group.update(camera);
    });
  }
}
```

## 7. パフォーマンス監視

### 7.1 パフォーマンスモニター
```typescript
// Performance.ts
export class PerformanceMonitor {
  private stats: Stats;
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    memory: 0
  };
  
  constructor() {
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }
  
  public beginFrame(): void {
    this.stats.begin();
  }
  
  public endFrame(renderer: WebGLRenderer): void {
    this.stats.end();
    
    // レンダラー情報取得
    const info = renderer.info;
    this.metrics.drawCalls = info.render.calls;
    this.metrics.triangles = info.render.triangles;
    
    // メモリ使用量
    if (performance.memory) {
      this.metrics.memory = performance.memory.usedJSHeapSize / 1048576;
    }
  }
  
  public shouldReduceQuality(): boolean {
    return this.metrics.fps < 30;
  }
}
```