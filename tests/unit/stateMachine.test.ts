import { describe, expect, it } from 'vitest';
import {
  createEnemyStateMachine,
  createPlayerStateMachine,
} from '../../src/core/entities/stateMachine';

describe('state machines', () => {
  it('allows player idle → run → attack', () => {
    const sm = createPlayerStateMachine();
    expect(sm.state).toBe('idle');
    expect(sm.tryTransition('run')).toBe(true);
    expect(sm.tryTransition('attack')).toBe(true);
  });

  it('prevents leaving dead enemy state', () => {
    const sm = createEnemyStateMachine();
    sm.force('dead');
    expect(sm.tryTransition('chase')).toBe(false);
    expect(sm.state).toBe('dead');
  });
});
