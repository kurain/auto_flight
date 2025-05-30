import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ミサイルクラス
class Missile {
  public mesh: THREE.Mesh;
  private velocity: THREE.Vector3;
  private target: THREE.Object3D;
  private speed = 0.15;
  private turnSpeed = 0.03;
  private lifetime = 0;
  private maxLifetime = 10; // 10秒で消滅
  private trail: SmokeTrail;
  
  constructor(scene: THREE.Scene, position: THREE.Vector3, target: THREE.Object3D) {
    // ミサイルの形状（シンプルな円錐形）
    const geometry = new THREE.ConeGeometry(0.05, 0.3, 4);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
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
  
  update(deltaTime: number): boolean {
    this.lifetime += deltaTime;
    
    // 寿命チェック
    if (this.lifetime > this.maxLifetime) {
      return false; // 削除すべき
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
    if (distance < 1.5) { // 爆発距離を増加
      return false; // 近接爆発
    }
    
    return true; // 継続
  }
  
  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
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
      sizeAttenuation: true
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    scene.add(this.particleSystem);
  }
  
  update(deltaTime: number): boolean {
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
  
  dispose() {
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
  
  update(position: THREE.Vector3, deltaTime: number) {
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
        opacity: opacity
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
    75,
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
  const initialCameraOffset = new THREE.Vector3(0, 3, -5); // 初期位置（より近く）
  const finalCameraOffset = new THREE.Vector3(0, 1, -1.5); // 最終位置（かなり近く）
  const cameraOffset = initialCameraOffset.clone();
  const cameraLookOffset = new THREE.Vector3(0, 0, 0); // 戦闘機を直接見る
  const zoomDuration = 15.0; // 15秒かけてズーム（より速く）
  let zoomTime = 0;
  
  // 戦闘機モデルを格納する変数
  let fighter: THREE.Object3D | null = null;
  let smokeTrail: SmokeTrail | null = null;
  
  // ミサイル管理
  const missiles: Missile[] = [];
  let missileSpawnTimer = 0;
  const missileSpawnInterval = 0.2; // 0.2秒ごとに発射（バースト内）
  let burstCount = 0; // 現在のバースト内の発射数
  const burstSize = 5; // 1バーストあたり5発
  let burstDelayTimer = 0; // バースト間の待機時間
  const burstDelay = 2.0; // バースト間は2秒待機
  let currentSpawnPosition: THREE.Vector3 | null = null; // 現在の発射位置
  
  // 爆発エフェクト管理
  const explosions: Explosion[] = [];
  
  // GLTFLoaderでfighter.glbを読み込み
  const loader = new GLTFLoader();
  loader.load(
    '/data/fighter.glb',
    (gltf: any) => {
      fighter = gltf.scene;
      if (fighter) {
        fighter.scale.set(0.5, 0.5, 0.5); // スケール調整
        fighter.position.set(0, 0, 0);
        scene.add(fighter);
        
        // 飛行機雲エフェクトを初期化
        smokeTrail = new SmokeTrail(scene);
      }
      
      console.log('Fighter model loaded successfully');
    },
    (progress: any) => {
      console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%');
    },
    (error: any) => {
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
    
    // カメラを戦闘機に追従
    if (fighter) {
      // ズーム効果の更新
      if (zoomTime < zoomDuration) {
        zoomTime += deltaTime;
        const zoomProgress = Math.min(zoomTime / zoomDuration, 1.0);
        // イージング関数（スムーズな加速・減速）
        const easedProgress = 1 - Math.pow(1 - zoomProgress, 3);
        cameraOffset.lerpVectors(initialCameraOffset, finalCameraOffset, easedProgress);
      }
      
      // カメラ位置を戦闘機の位置 + オフセットに設定
      camera.position.copy(fighter.position).add(cameraOffset);
      
      // カメラを戦闘機の少し前方を見るように設定
      const lookTarget = fighter.position.clone().add(cameraLookOffset);
      camera.lookAt(lookTarget);
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