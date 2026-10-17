import { describe, expect, it, vi } from 'vitest';
import { DisposableBag } from '../../src/core/scene/disposables';

describe('scene disposables', () => {
  it('runs each disposer once on teardown', () => {
    const bag = new DisposableBag();
    const a = vi.fn();
    const b = vi.fn();
    bag.add(a);
    bag.add(b);
    bag.disposeAll();
    bag.disposeAll();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(bag.size).toBe(0);
  });

  it('can reset for a subsequent scene create', () => {
    const bag = new DisposableBag();
    bag.add(() => undefined);
    bag.disposeAll();
    bag.reset();
    expect(bag.isDisposed).toBe(false);
    const c = vi.fn();
    bag.add(c);
    bag.disposeAll();
    expect(c).toHaveBeenCalledTimes(1);
  });
});
