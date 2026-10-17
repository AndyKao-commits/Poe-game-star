import { createGameConfig } from './game/config';
import Phaser from 'phaser';

declare global {
  interface Window {
    __ASHEN_GAME__?: Phaser.Game;
  }
}

function boot(): void {
  const root = document.getElementById('game-root');
  if (!root) {
    throw new Error('Missing #game-root');
  }
  const game = new Phaser.Game(createGameConfig(root));
  window.__ASHEN_GAME__ = game;
}

boot();
