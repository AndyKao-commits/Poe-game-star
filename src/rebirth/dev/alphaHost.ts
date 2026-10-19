import Phaser from 'phaser';
export { REQUIRED_ALPHA_ART, verifyAlphaArt } from '../art/alphaReadiness';
import { RebirthAlleyAlphaScene } from '../scenes/RebirthAlleyAlphaScene';
import {
  RebirthMobileCombatBridge, type MobileCombatControls,
} from './mobileCombatBridge';

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
  scene.events.once(Phaser.Scenes.Events.CREATE, () => {
    bridge?.dispose();
    bridge = new RebirthMobileCombatBridge(controls, scene);
  });
  scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
    bridge?.dispose();
    bridge = null;
  });
  return {
    game,
    destroy() {
      bridge?.dispose();
      bridge = null;
      game.destroy(true);
    },
  };
}
