import { createGameConfig } from './game/config';
import Phaser from 'phaser';

function boot(): void {
  const root = document.getElementById('game-root');
  if (!root) {
    throw new Error('Missing #game-root');
  }
  new Phaser.Game(createGameConfig(root));
}

boot();
