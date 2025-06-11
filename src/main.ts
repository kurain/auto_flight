import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// カメラモードの列挙型
enum CameraMode {
  MISSILE_TRACKING = 0, // ミサイル追跡
  DYNAMIC = 1, // ダイナミック
  OVERVIEW = 2, // 俯瞰固定
}

// ミサイルクラス
class Missile {
  public mesh: THREE.Mesh;
  private velocity: THREE.Vector3;
  private target: THREE.Object3D;
  private speed = 0.15;
  private turnSpeed = 0.03;
  private lifetime = 0;
  private maxLifetime = 5; // 5秒で自爆
  private trail: SmokeTrail;
  private hasPassedTarget = false; // ターゲットを通過したかどうか
  private previousDistance = Infinity; // 前フレームの距離

  constructor(scene: THREE.Scene, position: THREE.Vector3, target: THREE.Object3D) {
    // ミサイルの形状（シンプルな円錐形）
    const geometry = new THREE.ConeGeometry(0.05, 0.3, 4);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    // rotateXを削除（デフォルトの向きを使用）

    scene.add(this.mesh);

    this.target = target;
    this.velocity = new THREE.Vector3(0, 0, 0);

    // ミサイル用の煙エフェクト（パーティクル数を少なくして識別）
    this.trail = new SmokeTrail(scene);
    this.trail.maxParticles = 50; // ミサイル用は50個
  }

  public update(deltaTime: number): boolean {
    this.lifetime += deltaTime;

    // 寿命チェック（時間切れで自爆）
    if (this.lifetime > this.maxLifetime) {
      return false; // 自爆
    }

    // ターゲットへの方向を計算
    const targetDirection = new THREE.Vector3();
    targetDirection.subVectors(this.target.position, this.mesh.position);
    targetDirection.normalize();

    // 現在の進行方向（ミサイルの前方向）
    const forward = new THREE.Vector3(0, 1, 0); // ConeのデフォルトがY軸なので
    forward.applyQuaternion(this.mesh.quaternion);

    // 方向を徐々に修正（ホーミング）
    forward.lerp(targetDirection, this.turnSpeed);
    forward.normalize();

    // ミサイルの向きを更新
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, forward);
    this.mesh.quaternion.copy(quaternion);

    // 速度を更新して位置を移動
    this.velocity.copy(forward);
    this.velocity.multiplyScalar(this.speed);
    this.mesh.position.add(this.velocity);

    // 煙エフェクトの更新（ミサイルの後部）
    const exhaustOffset = new THREE.Vector3(0, -0.2, 0);
    exhaustOffset.applyQuaternion(this.mesh.quaternion);
    const exhaustPosition = this.mesh.position.clone().add(exhaustOffset);
    this.trail.update(exhaustPosition, deltaTime);

    // ターゲットとの距離チェック
    const distance = this.mesh.position.distanceTo(this.target.position);

    // 近接爆発（1.5ユニット以内）
    if (distance < 1.5) {
      return false; // 即座に爆発
    }

    // ターゲットを通過したかチェック（距離が増加に転じた場合）
    if (!this.hasPassedTarget) {
      if (distance > this.previousDistance && this.previousDistance < 2.0) {
        // 最接近点を通過した
        this.hasPassedTarget = true;
      }
      this.previousDistance = distance;
    }

    // 通過後、ある程度離れたら爆発
    if (this.hasPassedTarget && distance > 3.0) {
      return false; // 通過後爆発
    }

    return true; // 継続
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();

    // 軌跡も削除
    this.trail.dispose();
  }
}

// 爆発エフェクトクラス
class Explosion {
  private particleSystem: THREE.Points;
  private scene: THREE.Scene;
  private lifetime = 0;
  private maxLifetime = 0.8; // 0.8秒で消滅（短縮）
  private particleCount = 8; // パーティクル数を削減
  private velocities: THREE.Vector3[] = [];
  private initialPositions: Float32Array;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;

    // パーティクル用のジオメトリとマテリアル（1つのPointsオブジェクトで管理）
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    this.initialPositions = new Float32Array(this.particleCount * 3);

    // パーティクルの初期位置と速度を設定
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;

      this.initialPositions[i3] = position.x;
      this.initialPositions[i3 + 1] = position.y;
      this.initialPositions[i3 + 2] = position.z;

      // ランダムな速度ベクトル
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      velocity.normalize();
      velocity.multiplyScalar(Math.random() * 0.5 + 0.3);
      this.velocities.push(velocity);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // シンプルなポイントマテリアル
    const material = new THREE.PointsMaterial({
      color: 0xff8800,
      size: 0.5,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    scene.add(this.particleSystem);
  }

  public update(deltaTime: number): boolean {
    this.lifetime += deltaTime;

    if (this.lifetime > this.maxLifetime) {
      // パーティクルシステムを削除
      this.dispose();
      return false;
    }

    const lifeRatio = this.lifetime / this.maxLifetime;

    // パーティクルの位置を更新
    const positionAttribute = this.particleSystem.geometry.attributes['position'];
    if (positionAttribute) {
      const positions = positionAttribute.array as Float32Array;

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        const velocity = this.velocities[i];

        if (velocity && positions && i3 + 2 < positions.length) {
          // 位置の更新
          positions[i3] += velocity.x * deltaTime;
          positions[i3 + 1] += velocity.y * deltaTime;
          positions[i3 + 2] += velocity.z * deltaTime;
        }
      }

      // ジオメトリの更新フラグ
      positionAttribute.needsUpdate = true;
    }

    // マテリアルの更新（透明度とサイズ）
    const material = this.particleSystem.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, 1.0 - lifeRatio);
    material.size = 0.5 + lifeRatio * 1.0; // サイズを増加

    return true;
  }

  public dispose(): void {
    this.scene.remove(this.particleSystem);
    this.particleSystem.geometry.dispose();
    (this.particleSystem.material as THREE.Material).dispose();
  }
}

// 飛行機雲エフェクトクラス
class SmokeTrail {
  private particles: THREE.Mesh[] = []; // MeshのArrayに変更
  private positions: THREE.Vector3[] = [];
  private scene: THREE.Scene;
  public maxParticles = 200; // より多くの細かいパーティクル（publicに変更）
  private particleLifetime = 2.0; // 秒
  private particleAges: number[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // 全パーティクルを即座に削除
  public dispose(): void {
    for (const particle of this.particles) {
      this.scene.remove(particle);
      if (particle.geometry) {
        particle.geometry.dispose();
      }
      if (particle.material) {
        (particle.material as THREE.Material).dispose();
      }
    }
    this.particles = [];
    this.positions = [];
    this.particleAges = [];
  }

  public update(position: THREE.Vector3, deltaTime: number): void {
    // 新しい位置を追加
    this.positions.push(position.clone());
    this.particleAges.push(0);

    // 古いパーティクルを削除
    if (this.positions.length > this.maxParticles) {
      const oldParticle = this.particles.shift();
      if (oldParticle) {
        this.scene.remove(oldParticle);
        if (oldParticle.geometry) {
          oldParticle.geometry.dispose();
        }
        if (oldParticle.material) {
          (oldParticle.material as THREE.Material).dispose();
        }
      }
      this.positions.shift();
      this.particleAges.shift();
    }

    // パーティクルの年齢を更新
    for (let i = 0; i < this.particleAges.length; i++) {
      if (this.particleAges[i] !== undefined) {
        this.particleAges[i] += deltaTime;
      }
    }

    // 新しいパーティクルを作成
    if (this.positions.length > 0) {
      // ミサイルの軌跡は戦闘機より濃く太く
      const isMissileTrail = this.maxParticles === 50; // ミサイル用は50個に設定
      const size = isMissileTrail ? 0.02 : 0.012; // ミサイルは太く
      const opacity = isMissileTrail ? 0.7 : 0.4; // ミサイルは濃く

      const geometry = new THREE.SphereGeometry(size, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: opacity,
      });
      const particle = new THREE.Mesh(geometry, material); // PointsではなくMeshを使用
      particle.position.copy(position);
      this.particles.push(particle);
      this.scene.add(particle);
    }

    // パーティクルの更新（サイズと透明度）
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (particle) {
        const age = this.particleAges[i] || 0;
        const lifeRatio = age / this.particleLifetime;

        if (lifeRatio < 1.0) {
          const isMissileTrail = this.maxParticles === 50;
          const scale = 1.0 + lifeRatio * (isMissileTrail ? 0.2 : 0.3); // ミサイルは成長を抑える
          particle.scale.setScalar(scale);

          if (particle.material) {
            const material = particle.material as THREE.MeshBasicMaterial;
            const baseOpacity = isMissileTrail ? 0.7 : 0.4;
            material.opacity = Math.max(0, baseOpacity * (1.0 - lifeRatio)); // フェードアウト
          }
        }
      }
    }
  }
}

// 初期化処理
function init(): void {
  // ローディング画面を取得
  const loadingElement = document.getElementById('loading');

  // Three.js のセットアップ
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  // シーンの作成
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // スカイブルー

  // カメラの作成
  const camera = new THREE.PerspectiveCamera(
    20, // FOVをさらに狭くして強いズーム効果
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);

  // レンダラーの作成
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ライトの追加
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 10, 5);
  scene.add(directionalLight);

  // カメラコントロールの追加（一時的に無効化）
  // const controls = new OrbitControls(camera, renderer.domElement);
  // controls.enableDamping = true;
  // controls.dampingFactor = 0.05;
  // controls.screenSpacePanning = false;
  // controls.minDistance = 5;
  // controls.maxDistance = 50;
  // controls.maxPolarAngle = Math.PI / 2;

  // カメラ追従用の設定
  // const initialCameraOffset = new THREE.Vector3(0, 1, -2); // 初期位置（かなり近く）

  // カメラモード管理
  let cameraMode = CameraMode.MISSILE_TRACKING;
  let trackedMissile: Missile | null = null;

  // ダイナミックカメラ用
  let dynamicCameraTime = 0;
  let dynamicCameraPattern = 0;

  // 戦闘機モデルを格納する変数
  let fighter: THREE.Object3D | null = null;
  let smokeTrail: SmokeTrail | null = null;

  // 戦闘機の飛行制御
  const fighterVelocity = new THREE.Vector3(0, 0, 0);
  let evadeMode = false;
  let evadeTimer = 0;
  let evadePattern = 0;
  const evadeDuration = 1.0; // 回避行動の継続時間（1秒）
  const dangerDistance = 4.0; // 危険距離（よりギリギリに）
  let evadeEnabled = true; // 回避行動の有効/無効
  let returnToOrbitMode = false; // 軌道復帰モード
  let returnToOrbitTimer = 0;
  const returnToOrbitDuration = 1.0; // 軌道復帰時間
  const evadeStartPosition = new THREE.Vector3(); // 回避開始位置
  const evadeEndRotation = new THREE.Euler(); // 回避終了時の姿勢

  // ミサイル管理
  const missiles: Missile[] = [];
  let missileSpawnTimer = 0;
  const missileSpawnInterval = 0.05; // 0.05秒ごとに発射（バースト内、さらに速く）
  let burstCount = 0; // 現在のバースト内の発射数
  const burstSize = 10; // 1バーストあたり10発
  let burstDelayTimer = 0; // バースト間の待機時間
  const burstDelay = 0.5; // バースト間は0.5秒待機（さらに短縮）
  let currentSpawnPosition: THREE.Vector3 | null = null; // 現在の発射位置

  // 爆発エフェクト管理
  const explosions: Explosion[] = [];

  // GLTFLoaderでfighter.glbを読み込み
  const loader = new GLTFLoader();
  const baseUrl = import.meta.env.BASE_URL || '/';
  loader.load(
    `${baseUrl}data/fighter.glb`,
    gltf => {
      fighter = gltf.scene;
      if (fighter) {
        fighter.scale.set(0.5, 0.5, 0.5); // スケール調整
        fighter.position.set(0, 0, 0);
        scene.add(fighter);

        // 飛行機雲エフェクトを初期化
        smokeTrail = new SmokeTrail(scene);
      }

      // console.log('Fighter model loaded successfully');
    },
    _progress => {
      // Loading progress callback
    },
    error => {
      console.error('Error loading fighter model:', error);
    }
  );

  // ウィンドウリサイズ対応
  function handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  window.addEventListener('resize', handleResize);

  // キーボードイベント
  window.addEventListener('keydown', event => {
    if (event.key === 'v' || event.key === 'V') {
      // カメラモードを切り替え
      cameraMode = (cameraMode + 1) % 3;

      // ダイナミックカメラのパターンをリセット
      if (cameraMode === CameraMode.DYNAMIC) {
        dynamicCameraTime = 0;
        dynamicCameraPattern = Math.floor(Math.random() * 3);
      }
    } else if (event.key === 'm' || event.key === 'M') {
      // 緊急マニューバーの有効/無効を切り替え
      evadeEnabled = !evadeEnabled;
      // console.log(`緊急マニューバー: ${evadeEnabled ? '有効' : '無効'}`);
    }
  });

  // アニメーションループ
  let time = 0;
  let lastTime = performance.now();
  function animate(): void {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // 秒単位
    lastTime = currentTime;

    // 戦闘機の飛行アニメーション
    if (fighter) {
      // ミサイル接近検知
      let closestMissileDistance = Infinity;

      for (const missile of missiles) {
        if (missile && missile.mesh) {
          const distance = fighter.position.distanceTo(missile.mesh.position);
          if (distance < closestMissileDistance) {
            closestMissileDistance = distance;
          }
        }
      }

      // 危険距離内にミサイルがある場合、回避行動を開始（有効時のみ）
      if (
        closestMissileDistance < dangerDistance &&
        !evadeMode &&
        !returnToOrbitMode &&
        evadeEnabled
      ) {
        evadeMode = true;
        evadeTimer = 0;
        evadePattern = Math.floor(Math.random() * 4); // 0-3の回避パターン（クルビットを除外）
        evadeStartPosition.copy(fighter.position); // 回避開始位置を記録
      }

      // 回避行動の更新
      if (evadeMode) {
        evadeTimer += deltaTime;

        // 回避パターンごとの動き
        switch (evadePattern) {
          case 0: // バレルロール
            fighterVelocity.x = Math.cos(evadeTimer * 10) * 8;
            fighterVelocity.y = Math.sin(evadeTimer * 10) * 8;
            fighterVelocity.z = 10;
            fighter.rotation.x = evadeTimer * 5;
            break;

          case 1: {
            // インメルマンターン
            const t = evadeTimer / evadeDuration;
            fighterVelocity.x = 0;
            fighterVelocity.y = Math.sin(t * Math.PI) * 15;
            fighterVelocity.z = Math.cos(t * Math.PI) * 10;
            fighter.rotation.x = -t * Math.PI;
            break;
          }

          case 2: {
            // スプリットS
            const t2 = evadeTimer / evadeDuration;
            fighterVelocity.x = Math.sin(t2 * Math.PI * 2) * 10;
            fighterVelocity.y = -Math.abs(Math.sin(t2 * Math.PI)) * 10;
            fighterVelocity.z = 8;
            fighter.rotation.z = t2 * Math.PI * 2;
            break;
          }

          case 3: {
            // コブラ機動
            const t3 = evadeTimer / evadeDuration;
            fighterVelocity.x = 0;
            fighterVelocity.y = Math.sin(t3 * Math.PI) * 5;
            fighterVelocity.z = (1 - t3) * 2; // 急減速
            fighter.rotation.x = (-Math.sin(t3 * Math.PI) * Math.PI) / 2;
            break;
          }

          case 4: {
            // クルビット
            const t4 = evadeTimer / evadeDuration;
            fighterVelocity.x = 0;
            fighterVelocity.y = Math.sin(t4 * Math.PI * 2) * 12;
            fighterVelocity.z = Math.cos(t4 * Math.PI * 2) * 8;
            fighter.rotation.x = -t4 * Math.PI * 2;
            break;
          }
        }

        // 回避行動の終了
        if (evadeTimer > evadeDuration) {
          evadeMode = false;
          evadeTimer = 0;
          returnToOrbitMode = true; // 軌道復帰モードへ
          returnToOrbitTimer = 0;
          evadeEndRotation.copy(fighter.rotation); // 回避終了時の姿勢を記録
        }
      } else if (returnToOrbitMode) {
        // 軌道復帰モード
        returnToOrbitTimer += deltaTime;
        const t = Math.min(returnToOrbitTimer / returnToOrbitDuration, 1.0);

        // 目標位置（通常軌道上の位置）を計算
        const targetTime = time + returnToOrbitTimer;
        const radius = 5;
        const targetPos = new THREE.Vector3(
          Math.cos(targetTime) * radius,
          Math.sin(targetTime * 2) * 2 + 2,
          Math.sin(targetTime) * radius
        );

        // 現在位置から目標位置へスムーズに補間
        fighter.position.lerpVectors(fighter.position, targetPos, t * 0.1);

        // 目標の向きを計算
        const direction = new THREE.Vector3(
          -Math.sin(targetTime) * radius,
          Math.cos(targetTime * 2) * 2 * 2,
          Math.cos(targetTime) * radius
        );
        const targetQuaternion = new THREE.Quaternion();
        const targetMatrix = new THREE.Matrix4();
        targetMatrix.lookAt(
          fighter.position,
          fighter.position.clone().add(direction),
          new THREE.Vector3(0, 1, 0)
        );
        targetQuaternion.setFromRotationMatrix(targetMatrix);

        // 姿勢をスムーズに補間（Quaternionを使用）
        const currentQuaternion = new THREE.Quaternion().setFromEuler(evadeEndRotation);
        currentQuaternion.slerp(targetQuaternion, t * 0.1);
        fighter.quaternion.copy(currentQuaternion);

        // バンク角を追加
        fighter.rotation.z = Math.sin(targetTime) * 0.3 * t;

        // 軌道復帰完了
        if (returnToOrbitTimer >= returnToOrbitDuration) {
          returnToOrbitMode = false;
          returnToOrbitTimer = 0;
          time = targetTime; // 時間を同期
        }
      } else {
        // 通常の飛行
        time += 0.01;

        // 円形の飛行パス
        const radius = 5;
        fighter.position.x = Math.cos(time) * radius;
        fighter.position.z = Math.sin(time) * radius;
        fighter.position.y = Math.sin(time * 2) * 2 + 2; // 上下の動き

        // 進行方向を向く
        const direction = new THREE.Vector3(
          -Math.sin(time) * radius,
          Math.cos(time * 2) * 2 * 2,
          Math.cos(time) * radius
        );
        fighter.lookAt(fighter.position.clone().add(direction));

        // バンク角を追加
        fighter.rotation.z = Math.sin(time) * 0.3;

        // 速度をリセット
        fighterVelocity.set(0, 0, 0);
      }

      // 回避行動中は速度を適用
      if (evadeMode) {
        fighter.position.add(fighterVelocity.clone().multiplyScalar(deltaTime));
      }

      // 飛行機雲の更新
      if (smokeTrail) {
        // エンジン位置（戦闘機の後部）
        const engineOffset = new THREE.Vector3(0, -0.05, -0.3); // より近い位置
        engineOffset.applyQuaternion(fighter.quaternion);
        const enginePosition = fighter.position.clone().add(engineOffset);

        smokeTrail.update(enginePosition, deltaTime);
      }

      // ミサイル発射管理
      if (burstCount < burstSize) {
        // バースト発射中
        missileSpawnTimer += deltaTime;
        if (missileSpawnTimer >= missileSpawnInterval) {
          missileSpawnTimer = 0;

          // 最初の発射時に新しい位置を決定
          if (burstCount === 0) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 15 + Math.random() * 10;
            const height = Math.random() * 10 - 5;
            currentSpawnPosition = new THREE.Vector3(
              Math.cos(angle) * distance,
              fighter.position.y + height,
              Math.sin(angle) * distance
            );
          }

          // 同じ位置から発射
          if (currentSpawnPosition && fighter) {
            const missile = new Missile(scene, currentSpawnPosition.clone(), fighter);
            missiles.push(missile);
            burstCount++;

            // 追跡するミサイルを常に最新のものに更新（最後尾）
            trackedMissile = missile;
          }
        }
      } else {
        // バースト間の待機
        burstDelayTimer += deltaTime;
        if (burstDelayTimer >= burstDelay) {
          burstDelayTimer = 0;
          burstCount = 0; // 次のバーストを開始
          missileSpawnTimer = 0;
        }
      }

      // ミサイルの更新
      for (let i = missiles.length - 1; i >= 0; i--) {
        const missile = missiles[i];
        if (missile) {
          const shouldKeep = missile.update(deltaTime);

          if (!shouldKeep) {
            // 爆発エフェクトを生成
            const explosion = new Explosion(scene, missile.mesh.position.clone());
            explosions.push(explosion);

            // ミサイルを削除
            missile.dispose(scene);
            missiles.splice(i, 1);
          }
        }
      }

      // 爆発エフェクトの更新
      for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        if (explosion) {
          const shouldKeep = explosion.update(deltaTime);

          if (!shouldKeep) {
            // 爆発エフェクトを削除
            explosions.splice(i, 1);
          }
        }
      }
    }

    // カメラ制御
    if (fighter) {
      switch (cameraMode) {
        case CameraMode.MISSILE_TRACKING:
          // ミサイル追跡カメラ
          if (trackedMissile && missiles.includes(trackedMissile)) {
            camera.position.copy(trackedMissile.mesh.position);
            camera.lookAt(fighter.position);
          } else {
            // 新しいミサイルを探す
            if (missiles.length > 0) {
              trackedMissile = missiles[missiles.length - 1];
            }
            // ミサイルがない場合は戦闘機追従
            camera.position.copy(fighter.position).add(new THREE.Vector3(0, 2, -5));
            camera.lookAt(fighter.position);
          }
          break;

        case CameraMode.DYNAMIC:
          // ダイナミックカメラ
          dynamicCameraTime += deltaTime;

          switch (dynamicCameraPattern) {
            case 0: {
              // 回転しながらズーム
              const angle1 = dynamicCameraTime * 0.5;
              const dist1 = 10 - Math.sin(dynamicCameraTime * 0.3) * 5;
              camera.position.set(
                fighter.position.x + Math.cos(angle1) * dist1,
                fighter.position.y + 3 + Math.sin(dynamicCameraTime * 0.2) * 2,
                fighter.position.z + Math.sin(angle1) * dist1
              );
              break;
            }

            case 1: {
              // 上空から急降下
              const t1 = (dynamicCameraTime % 5) / 5;
              camera.position.set(
                fighter.position.x + Math.sin(t1 * Math.PI * 2) * 5,
                fighter.position.y + 20 - t1 * 15,
                fighter.position.z - 5 + t1 * 10
              );
              break;
            }

            case 2: {
              // サイドから接近
              const t2 = (dynamicCameraTime % 4) / 4;
              const side = Math.floor(dynamicCameraTime / 4) % 2 === 0 ? 1 : -1;
              camera.position.set(
                fighter.position.x + side * (15 - t2 * 10),
                fighter.position.y + 2,
                fighter.position.z + Math.sin(t2 * Math.PI) * 5
              );
              break;
            }
          }

          camera.lookAt(fighter.position);

          // パターンを定期的に切り替え
          if (dynamicCameraTime > 5) {
            dynamicCameraTime = 0;
            dynamicCameraPattern = (dynamicCameraPattern + 1) % 3;
          }
          break;

        case CameraMode.OVERVIEW:
          // 俯瞰固定カメラ
          camera.position.set(20, 30, 20);
          camera.lookAt(new THREE.Vector3(0, 0, 0));
          break;
      }
    }

    renderer.render(scene, camera);
  }

  // ローディング画面を非表示
  setTimeout(() => {
    loadingElement?.classList.add('hidden');
  }, 1000);

  // アニメーション開始
  animate();
}

// ページ読み込み完了後に初期化
window.addEventListener('DOMContentLoaded', init);
