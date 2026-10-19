import { describe, expect, it, vi } from 'vitest';
import { RebirthJoystickController } from '../../src/rebirth/input/joystickController';
import { RebirthJoystickPointerAdapter } from '../../src/rebirth/input/joystickPointerAdapter';
import type { JoystickSnapshot } from '../../src/rebirth/input/joystickController';

class FakeElement extends EventTarget {
  captured = new Set<number>();
  getBoundingClientRect() { return { left: 40, top: 60, width: 400, height: 240 }; }
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
}
class FakeDocument extends EventTarget {
  visibilityState = 'visible';
}
function pointer(type: string, id: number, x: number, y: number): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: id },
    clientX: { value: x },
    clientY: { value: y },
  });
  return event;
}
function fixture() {
  const element = new FakeElement();
  const win = new EventTarget();
  const doc = new FakeDocument();
  const changes = vi.fn<(state: JoystickSnapshot) => void>();
  const controller = new RebirthJoystickController(
    { x: 100, y: 100 },
    { radius: 56, deadZone: 0.16, captureRadius: 70 },
  );
  const adapter = new RebirthJoystickPointerAdapter(
    element as unknown as HTMLElement,
    controller,
    changes,
    win as unknown as Window,
    doc as unknown as Document,
  );
  return { element, win, doc, controller, changes, adapter };
}

describe('Rebirth DOM pointer adapter', () => {
  it('maps page coordinates into element-local CSS pixels and captures only owner', () => {
    const f = fixture();
    const down = pointer('pointerdown', 11, 140, 160);
    f.element.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(f.element.captured.has(11)).toBe(true);
    expect(f.controller.snapshot().pointerId).toBe(11);
    f.element.dispatchEvent(pointer('pointermove', 11, 196, 160));
    expect(f.controller.snapshot().stick.magnitude).toBeCloseTo(1);
    expect(f.controller.snapshot().center).toEqual({ x: 100, y: 100 });
    f.adapter.dispose();
  });

  it('does not capture a remote or second attack pointer', () => {
    const f = fixture();
    f.element.dispatchEvent(pointer('pointerdown', 1, 440, 160));
    expect(f.element.captured.size).toBe(0);
    f.element.dispatchEvent(pointer('pointerdown', 2, 140, 160));
    f.element.dispatchEvent(pointer('pointerdown', 3, 140, 160));
    expect([...f.element.captured]).toEqual([2]);
    f.element.dispatchEvent(pointer('pointermove', 3, 180, 160));
    expect(f.controller.snapshot().stick.magnitude).toBe(0);
    f.adapter.dispose();
  });

  it('clears movement on pointercancel and lostpointercapture', () => {
    const f = fixture();
    f.element.dispatchEvent(pointer('pointerdown', 5, 140, 160));
    f.element.dispatchEvent(pointer('pointermove', 5, 196, 160));
    f.element.dispatchEvent(pointer('pointercancel', 5, 196, 160));
    expect(f.controller.snapshot().pointerId).toBeNull();
    expect(f.element.captured.size).toBe(0);
    f.element.dispatchEvent(pointer('pointerdown', 6, 140, 160));
    f.element.dispatchEvent(pointer('lostpointercapture', 6, 140, 160));
    expect(f.controller.snapshot().pointerId).toBeNull();
    f.adapter.dispose();
  });

  it('resets on blur, orientation change and hidden page', () => {
    const f = fixture();
    for (const eventType of ['blur', 'orientationchange']) {
      f.element.dispatchEvent(pointer('pointerdown', 8, 140, 160));
      f.element.dispatchEvent(pointer('pointermove', 8, 196, 160));
      f.win.dispatchEvent(new Event(eventType));
      expect(f.controller.snapshot().stick.magnitude).toBe(0);
      expect(f.element.captured.size).toBe(0);
    }
    f.element.dispatchEvent(pointer('pointerdown', 9, 140, 160));
    f.doc.visibilityState = 'hidden';
    f.doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.controller.snapshot().pointerId).toBeNull();
    f.adapter.dispose();
  });

  it('releases capture when switching modes and removes listeners on dispose', () => {
    const f = fixture();
    f.element.dispatchEvent(pointer('pointerdown', 12, 140, 160));
    f.adapter.setMode('floating');
    expect(f.controller.snapshot().mode).toBe('floating');
    expect(f.controller.snapshot().pointerId).toBeNull();
    expect(f.element.captured.size).toBe(0);
    f.adapter.dispose();
    const count = f.changes.mock.calls.length;
    f.element.dispatchEvent(pointer('pointerdown', 13, 140, 160));
    f.win.dispatchEvent(new Event('blur'));
    expect(f.changes).toHaveBeenCalledTimes(count);
    expect(f.controller.snapshot().pointerId).toBeNull();
  });
  it('keeps moving when pointer capture is unavailable (iOS embedded browser fallback)', () => {
    const f = fixture();
    f.element.setPointerCapture = () => { throw new Error('capture unsupported'); };
    f.element.dispatchEvent(pointer('pointerdown', 21, 140, 160));
    expect(f.controller.snapshot().pointerId).toBe(21);
    f.win.dispatchEvent(pointer('pointermove', 21, 196, 160));
    expect(f.controller.snapshot().stick.magnitude).toBeGreaterThan(0);
    f.win.dispatchEvent(pointer('pointerup', 21, 196, 160));
    expect(f.controller.snapshot().pointerId).toBeNull();
    expect(f.controller.snapshot().stick.magnitude).toBe(0);
    f.adapter.dispose();
  });

});
