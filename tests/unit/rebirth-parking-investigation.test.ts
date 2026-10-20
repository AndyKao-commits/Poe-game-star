import { describe, expect, it } from 'vitest';
import { advanceGarage, garageView, initialGarageState } from '../../src/rebirth/dev/parkingInvestigation';

describe('Chapter 1 B2 parking investigation', () => {
  it('records optional seal evidence before following victims to workshop', () => {
    let state = initialGarageState();
    expect(garageView(state).actions).toHaveLength(2);
    state = advanceGarage(state, 'inspect-seal');
    expect(state.step).toBe('security');
    expect(state.evidence).toContain('B2 增幅器測試封條');
    state = advanceGarage(state, 'listen');
    expect(state.step).toBe('voices');
    state = advanceGarage(state, 'follow-cable');
    expect(state.step).toBe('workshop');
    expect(state.evidence).toHaveLength(2);
    state = advanceGarage(state, 'enter');
    expect(state.complete).toBe(true);
    expect(garageView(state).actions).toHaveLength(0);
    expect(advanceGarage(state, 'enter')).toEqual(state);
  });
  it('supports an alternate route without optional seal evidence', () => {
    let state = advanceGarage(initialGarageState(), 'listen');
    state = advanceGarage(state, 'follow-cable');
    expect(state.evidence).toEqual(['受困測試者的求救聲']);
    expect(advanceGarage(state, 'enter').complete).toBe(true);
  });
  it('rejects skipping the investigation and resets all run state', () => {
    const start = initialGarageState();
    expect(() => advanceGarage(start, 'enter')).toThrow('Invalid garage investigation action');
    const explored = advanceGarage(start, 'inspect-seal');
    expect(initialGarageState()).toEqual({ step: 'entrance', evidence: [], complete: false });
    expect(explored.evidence).toHaveLength(1);
    expect(start.evidence).toHaveLength(0);
  });
});
