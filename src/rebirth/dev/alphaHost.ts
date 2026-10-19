import Phaser from 'phaser';
export { REQUIRED_ALPHA_ART, verifyAlphaArt } from '../art/alphaReadiness';
import { verifyAlphaArt } from '../art/alphaReadiness';
import { RebirthAlleyAlphaScene } from '../scenes/RebirthAlleyAlphaScene';
import {
  RebirthMobileCombatBridge, type MobileCombatControls,
} from './mobileCombatBridge';

export interface AlphaHost {
  game: Phaser.Game;
  destroy(): void;
  retry(): void;
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
  // The scene is not booted when new Phaser.Game returns. scene.events is
  // injected later; sys.events exists from the Scene constructor. Register on
  // the stable emitter now or Alpha startup throws and leaves the HUD hidden.
  // CREATE occurs again after scene.restart(); once() would leave controls dead.
  scene.sys.events.on(Phaser.Scenes.Events.CREATE, attach);
  scene.sys.events.on(Phaser.Scenes.Events.SHUTDOWN, detach);
  return {
    game,
    retry() { scene.retry(); },
    destroy() {
      scene.sys.events.off(Phaser.Scenes.Events.CREATE, attach);
      scene.sys.events.off(Phaser.Scenes.Events.SHUTDOWN, detach);
      detach();
      game.destroy(true);
    },
  };
}

/**
 * Explicit opt-in developer-only bootstrap. Neither successful fetches nor a
 * green CI run imply artistic approval; caller must supply a separate review
 * decision. The release entry never imports this function.
 */
export async function mountReviewedRebirthAlpha(
  container: HTMLElement,
  controls: MobileCombatControls,
  options: { artReviewed: boolean; fetcher?: typeof fetch },
): Promise<AlphaHost> {
  if (!options.artReviewed) {
    throw new Error('Rebirth Alpha blocked: original art review not approved');
  }
  const readiness = await verifyAlphaArt(options.fetcher);
  if (!readiness.ready) {
    throw new Error(
      `Rebirth Alpha blocked: missing [${readiness.missing.join(', ')}], invalid MIME [${readiness.invalidType.join(', ')}]`,
    );
  }
  return mountRebirthAlpha(container, controls);
}
