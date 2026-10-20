import { describe, expect, it } from 'vitest';
import { advanceGarage, garageOutcome, garageView, initialGarageState } from '../../src/rebirth/dev/parkingInvestigation';

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

describe('B2 optional electrical panel interaction', () => {
  it('isolates only the amplifier test circuit and keeps ventilation on', () => {
    let state = advanceGarage(initialGarageState(), 'listen');
    expect(garageView(state).actions.map(a => a.id)).toContain('inspect-panel');
    state = advanceGarage(state, 'inspect-panel');
    expect(garageView(state).story).toContain('C：緊急排風');
    state = advanceGarage(state, 'isolate-test');
    expect(state.step).toBe('voices');
    expect(state.evidence).toContain('已隔離非法增幅器測試迴路');
    expect(garageView(state).actions.map(a => a.id)).not.toContain('inspect-panel');
    expect(garageView(state).story).toContain('緊急排風仍正常運轉');
    state = advanceGarage(state, 'follow-cable');
    expect(garageView(state).story).toContain('警報逐漸減弱');
    expect(advanceGarage(state, 'enter').complete).toBe(true);
  });

  it('intercepts unsafe ventilation cut without losing clues or locking progression', () => {
    let state = advanceGarage(initialGarageState(), 'inspect-seal');
    state = advanceGarage(state, 'listen');
    state = advanceGarage(state, 'inspect-panel');
    const evidenceBefore = state.evidence;
    state = advanceGarage(state, 'cut-ventilation');
    expect(state.step).toBe('power');
    expect(state.evidence).toEqual(evidenceBefore);
    expect(garageView(state).story).toContain('沒有切斷 C 迴路');
    state = advanceGarage(state, 'isolate-test');
    expect(state.warning).toBeUndefined();
    expect(state.evidence).toHaveLength(2);
    expect(() => advanceGarage(state, 'cut-ventilation')).toThrow('Invalid garage investigation action');
  });

  it('can leave the panel and finish the original direct route without optional evidence', () => {
    let state = advanceGarage(initialGarageState(), 'listen');
    state = advanceGarage(state, 'inspect-panel');
    state = advanceGarage(state, 'leave-panel');
    expect(state.evidence).toEqual([]);
    state = advanceGarage(state, 'follow-cable');
    expect(garageView(state).story).toContain('仍在供電');
    expect(advanceGarage(state, 'enter').complete).toBe(true);
    expect(initialGarageState()).toEqual({ step: 'entrance', evidence: [], complete: false });
  });
});

describe('B2 electronic lock puzzle and infiltration grades', () => {
  it('awards A only for safe isolation and silent entry with the recovered seal', () => {
    let state = advanceGarage(initialGarageState(), 'inspect-seal');
    state = advanceGarage(state, 'listen');
    state = advanceGarage(state, 'inspect-panel');
    state = advanceGarage(state, 'isolate-test');
    state = advanceGarage(state, 'follow-cable');
    state = advanceGarage(state, 'inspect-lock');
    expect(garageView(state).actions.map(a => a.id)).toContain('decode-label');
    state = advanceGarage(state, 'decode-label');
    expect(state.complete).toBe(true);
    expect(state.quietEntry).toBe(true);
    expect(state.evidence).toContain('電子鎖的維護識別碼');
    expect(garageOutcome(state)?.rank).toBe('A');
    expect(garageView(state).actions).toHaveLength(0);
  });

  it('prevents silent entry without seal and produces a C alarm outcome', () => {
    let state = advanceGarage(initialGarageState(), 'listen');
    state = advanceGarage(state, 'follow-cable');
    state = advanceGarage(state, 'inspect-lock');
    expect(garageView(state).actions.map(a => a.id)).not.toContain('decode-label');
    expect(() => advanceGarage(state, 'decode-label')).toThrow('Invalid garage investigation action');
    state = advanceGarage(state, 'force-door');
    expect(garageOutcome(state)?.rank).toBe('C');
    expect(garageOutcome(state)?.summary).toContain('警報');
  });

  it('gives B for one precaution and supports returning from the lock', () => {
    let state = advanceGarage(initialGarageState(), 'inspect-seal');
    state = advanceGarage(state, 'listen');
    state = advanceGarage(state, 'follow-cable');
    state = advanceGarage(state, 'inspect-lock');
    state = advanceGarage(state, 'return-workshop');
    expect(state.complete).toBe(false);
    state = advanceGarage(state, 'inspect-lock');
    state = advanceGarage(state, 'decode-label');
    expect(garageOutcome(state)?.rank).toBe('B');
    expect(garageOutcome(initialGarageState())).toBeNull();
  });

  it('does not mutate completed outcomes on repeated choices', () => {
    let state = advanceGarage(initialGarageState(), 'listen');
    state = advanceGarage(state, 'follow-cable');
    state = advanceGarage(state, 'enter');
    expect(garageOutcome(state)?.rank).toBe('C');
    expect(advanceGarage(state, 'inspect-lock')).toEqual(state);
  });
});
