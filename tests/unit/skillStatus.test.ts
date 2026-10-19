import { describe, expect, it } from 'vitest';
import {
  createCasterState,
  tickCooldowns,
  tryCast,
} from '../../src/core/skills';
import {
  allSkillUiSnapshots,
  skillAriaLabel,
  skillCooldownProgress,
  skillUiFromCaster,
} from '../../src/ui/skillStatus';

describe('skillUiFromCaster', () => {
  it('marks all skills unavailable when caster is not wired', () => {
    const snaps = allSkillUiSnapshots(null);
    expect(snaps).toHaveLength(3);
    for (const snap of snaps) {
      expect(snap.availability).toBe('unavailable');
      expect(snap.cooldownDisplaySec).toBeNull();
    }
  });

  it('reports ready when resources and cooldowns allow cast', () => {
    const caster = createCasterState({ mana: 50, stamina: 100 });
    expect(skillUiFromCaster(caster, 'q').availability).toBe('ready');
    expect(skillUiFromCaster(caster, 'e').availability).toBe('ready');
    expect(skillUiFromCaster(caster, 'dodge').availability).toBe('ready');
  });

  it('distinguishes cooldown vs insufficient mana vs insufficient stamina', () => {
    let caster = createCasterState({ mana: 50, stamina: 100 });
    const castQ = tryCast(caster, 'q', { baseAttack: 10, defense: 0 });
    expect(castQ.ok).toBe(true);
    if (castQ.ok) caster = castQ.state;

    const q = skillUiFromCaster(caster, 'q');
    expect(q.availability).toBe('cooldown');
    expect(q.cooldownRemainingMs).toBeGreaterThan(0);
    expect(q.cooldownDisplaySec).toBeGreaterThanOrEqual(1);
    expect(skillCooldownProgress(q)).toBeGreaterThan(0);

    const lowMana = createCasterState({ mana: 5, maxMana: 50, stamina: 100 });
    expect(skillUiFromCaster(lowMana, 'e').availability).toBe('insufficient_mana');

    const lowStamina = createCasterState({ mana: 50, stamina: 5, maxStamina: 100 });
    expect(skillUiFromCaster(lowStamina, 'dodge').availability).toBe('insufficient_stamina');
  });

  it('ticks cooldown progress down without inventing timers', () => {
    let caster = createCasterState();
    const cast = tryCast(caster, 'q', { baseAttack: 10, defense: 0 });
    expect(cast.ok).toBe(true);
    if (cast.ok) caster = cast.state;

    const before = skillUiFromCaster(caster, 'q');
    caster = tickCooldowns(caster, 1000);
    const after = skillUiFromCaster(caster, 'q');
    expect(after.cooldownRemainingMs).toBeLessThan(before.cooldownRemainingMs);
    expect(after.cooldownRemainingMs).toBe(before.cooldownRemainingMs - 1000);
  });

  it('builds readable aria labels per state', () => {
    const ready = skillUiFromCaster(createCasterState(), 'q');
    expect(skillAriaLabel(ready)).toContain('可用');

    const unavailable = skillUiFromCaster(null, 'e');
    expect(skillAriaLabel(unavailable)).toContain('尚未接入');
  });
});
