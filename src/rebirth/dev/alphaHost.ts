import Phaser from 'phaser';
export { REQUIRED_ALPHA_ART, verifyAlphaArt } from '../art/alphaReadiness';
import { RebirthAlleyAlphaScene } from '../scenes/RebirthAlleyAlphaScene';
import {
  RebirthMobileCombatBridge, type MobileCombatControls,
} from './mobileCombatBridge';

export interface AlphaHost {
  game: Phaser.Game;
  destroy(): void;
}

/**
 * Art-gated development-only host. Never imported by src/main.ts.
 * Requires actual approved assets to exist; never supplies placeholders.
 */
/**
 * The caller must have already approved all art and run QA; availability alone
 * does not imply art acceptance. Host wires scene create/shutdown to DOM input.
 */
export function mountRebirthAlpha(
  container: HTMLElement,
  controls: MobileCombatControls,
): AlphaHost {
  let bridge: RebirthMobileCombatBridge | null = null;
  const scene = new RebirthAlleyAlphaScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 480,
    height: 270,
    backgroundColor: '#101a2a',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 480,
      height: 270,
    },
    scene: [scene],
    render: { antialias: false },
  });
  const attach = (): void => {
    bridge?.dispose();
    bridge = new RebirthMobileCombatBridge(controls, scene);
  };
  const detach = (): void => {
    bridge?.dispose();
    bridge = null;
  };
  // CREATE occurs again after scene.restart(); once() would leave controls dead.
  scene.events.on(Phaser.Scenes.Events.CREATE, attach);
  scene.events.on(Phaser.Scenes.Events.SHUTDOWN, detach);
  return {
    game,
    destroy() {
      scene.events.off(Phaser.Scenes.Events.CREATE, attach);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, detach);
      detach();
      game.destroy(true);
    },
  };
}
