import { describe, expect, it } from 'vitest';
import {
  createEnemyStateMachine,
  createPlayerStateMachine,
} from '../../src/core/entities/stateMachine';

describe('state machines', () => {
  it('allows player idle → run → attack → dead', () => {
    const sm = createPlayerStateMachine();
    expect(sm.state).toBe('idle');
    expect(sm.tryTransition('run')).toBe(true);
    expect(sm.tryTransition('attack')).toBe(true);
    expect(sm.tryTransition('dead')).toBe(true);
    expect(sm.tryTransition('idle')).toBe(false);
  });

  it('supports enemy windup/attack/recovery and blocks leaving dead', () => {
    const sm = createEnemyStateMachine();
    expect(sm.tryTransition('chase')).toBe(true);
    expect(sm.tryTransition('windup')).toBe(true);
    expect(sm.tryTransition('attack')).toBe(true);
    expect(sm.tryTransition('recovery')).toBe(true);
    sm.force('dead');
    expect(sm.tryTransition('chase')).toBe(false);
    expect(sm.state).toBe('dead');
  });
});
