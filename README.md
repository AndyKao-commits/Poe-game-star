# Ashen Reliquary (Poe-game-star)

暗黑奇幻精緻像素風 ARPG — **第一階段可玩原型**。

## 技術棧

- Vite + TypeScript + Phaser 3
- 模組化架構：`src/core`（純邏輯）、`src/game`（Phaser 渲染）、`src/ui`（HUD）
- Vitest 單元測試、Playwright E2E
- 第一階段不含 React / Supabase / 多人連線

## 目錄

```
src/core/     # 等角座標、碰撞、傷害、狀態機（可單測）
src/game/     # Phaser 場景與實體
src/ui/       # DOM HUD（後續可換 React）
public/assets # 可替換的程序化佔位像素素材
tests/unit    # Vitest
tests/e2e     # Playwright
```

## 操作

- `WASD` 八方向移動（斜向速度正規化）
- 滑鼠左鍵：朝游標 120° 扇形普通攻擊（間隔 0.55s）

## 指令

```bash
npm install
npm run generate:assets   # 產生佔位 PNG
npm run dev
npm run typecheck
npm test
npm run build
npm run test:e2e          # 需先安裝瀏覽器：npx playwright install chromium
```

## 視角

固定 2:1 等角投影，地磚 64×32。世界座標與畫面座標分離；角色依腳底 `x+y` 深度排序。
