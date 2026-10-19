import Phaser from 'phaser';
import { RebirthEntryScene } from './scenes/RebirthEntryScene';

/** Independent Rebirth runtime; no legacy scene or artwork imports. */
export function createRebirthGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#07111b',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true,
    },
    scene: [RebirthEntryScene],
    banner: false,
  };
}
