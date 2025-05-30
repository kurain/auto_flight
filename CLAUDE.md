# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Itano Flight（板野フライト）は、板野サーカスの美しい弾幕シーンを再現する観賞用3Dフライトシミュレーターです。

## Development Setup

### 必要な環境
- Node.js 18以上
- npm または pnpm
- モダンブラウザ（WebGL 2.0対応）

### セットアップコマンド
```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

## Build and Test Commands

```bash
# TypeScript型チェック
npm run typecheck

# リント
npm run lint

# フォーマット
npm run format

# ビルド後のサイズ確認
npm run build && npm run preview
```

## Architecture

### ディレクトリ構造
- `src/core/` - アプリケーション基盤（App.ts、EventBus、ResourceManager）
- `src/entities/` - ゲームエンティティ（Aircraft、Missile）
- `src/effects/` - エフェクトシステム（SmokeTrail、Explosion）
- `src/physics/` - 物理エンジン（FlightDynamics、Collision）
- `src/camera/` - カメラシステム（CameraDirector、各種カメラモード）
- `src/ui/` - UIコンポーネント
- `src/rendering/` - レンダリング関連
- `src/utils/` - ユーティリティ（ObjectPool、Math）

### 主要な設計パターン
- Entity-Component システム
- Event-Driven Architecture
- Object Pooling（パフォーマンス最適化）
- LODシステム（描画最適化）

### 重要な仕様
- **観賞専用**：プレイヤー操作なし、全自動演出
- **TypeScript strict mode** 必須
- **60 FPS目標**（30 FPS最低保証）
- **メモリ上限**：500MB

詳細な仕様は `/docs` ディレクトリを参照してください。