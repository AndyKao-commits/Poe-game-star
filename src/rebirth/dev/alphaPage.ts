import { verifyAlphaArt } from '../art/alphaReadiness';
import type { AlphaHost } from './alphaHost';

const panel = document.getElementById('status-panel') as HTMLElement | null;
const title = document.getElementById('status-title') as HTMLElement | null;
const message = document.getElementById('status-message') as HTMLElement | null;
const assetList = document.getElementById('asset-list') as HTMLElement | null;
const start = document.getElementById('start') as HTMLButtonElement | null;
const retry = document.getElementById('retry') as HTMLButtonElement | null;
const restartRun = document.getElementById('restart-run') as HTMLButtonElement | null;
const gameContainer = document.getElementById('game') as HTMLElement | null;
const controlsPanel = document.getElementById('controls') as HTMLElement | null;

if (!panel || !title || !message || !assetList || !start || !retry || !restartRun || !gameContainer || !controlsPanel) {
  throw new Error('Rebirth Alpha page markup incomplete');
}

let mounted: AlphaHost | null = null;
let checking = false;
let assetsReady = false;

async function check(): Promise<void> {
  if (checking || mounted) return;
  checking = true;
  assetsReady = false;
  start!.disabled = true;
  retry!.disabled = true;
  title!.textContent = '正在檢查原創美術…';
  message!.textContent = '正在確認角色、敵人圖檔與動畫資料；不會使用舊版或臨時素材。';
  assetList!.replaceChildren();
  try {
    const result = await verifyAlphaArt();
    assetsReady = result.ready;
    if (result.ready) {
      title!.textContent = '資產已就緒，準備遊玩';
      message!.textContent = '目前是公開遊玩測試版；手機橫向遊玩，歡迎回報操作與畫面問題。';
      start!.disabled = false;
    } else {
      title!.textContent = '戰鬥尚未開放';
      message!.textContent = '缺少新版角色或敵人美術，暫時無法進入實際戰鬥。程式與觸控系統已建立，但不會以示意素材代替。';
      for (const path of result.missing) {
        const item = document.createElement('div');
        item.textContent = '缺少：' + path;
        assetList!.append(item);
      }
      for (const path of result.invalidType) {
        const item = document.createElement('div');
        item.textContent = '格式錯誤：' + path;
        assetList!.append(item);
      }
    }
  } catch (error) {
    title!.textContent = '資產檢查失敗';
    message!.textContent = error instanceof Error ? error.message : '發生未知錯誤';
  } finally {
    checking = false;
    retry!.disabled = false;
  }
}

start.addEventListener('click', async () => {
  if (!assetsReady || mounted) return;
  start!.disabled = true;
  title!.textContent = '載入戰鬥引擎…';
  try {
    // Phaser and scene code are only loaded after the art preflight.
    const { mountRebirthAlpha } = await import('./alphaHost');
    const get = (id: string): HTMLElement => {
      const element = document.getElementById(id);
      if (!element) throw new Error('Missing HUD control: ' + id);
      return element;
    };
    mounted = mountRebirthAlpha(gameContainer!, {
      surface: get('surface'),
      joystickBase: get('stick-base'),
      joystickKnob: get('stick-knob'),
      attack: get('attack') as HTMLButtonElement,
      punch: get('punch') as HTMLButtonElement,
      dash: get('dash') as HTMLButtonElement,
    });
    document.getElementById('app')?.classList.add('playing');
    controlsPanel!.hidden = false;
    restartRun!.hidden = false;
    panel!.hidden = true;
  } catch (error) {
    title!.textContent = '戰鬥初始化失敗';
    message!.textContent = error instanceof Error ? error.message : '未知載入錯誤';
    start!.disabled = false;
    mounted?.destroy();
    mounted = null;
    document.getElementById('app')?.classList.remove('playing');
    restartRun!.hidden = true;
  }
});
retry.addEventListener('click', () => { void check(); });
restartRun.addEventListener('click', () => {
  if (!mounted) return;
  // Reuse the scene lifecycle hooks so the mobile input bridge reattaches.
  mounted.retry();
});
window.addEventListener('pagehide', () => {
  mounted?.destroy();
  mounted = null;
});
void check();
