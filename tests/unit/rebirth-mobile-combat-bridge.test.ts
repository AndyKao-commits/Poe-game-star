import { describe, expect, it, vi } from 'vitest';
import { RebirthMobileCombatBridge, type MobileCombatSink } from '../../src/rebirth/dev/mobileCombatBridge';
import type { StickVector } from '../../src/rebirth/input/touchControls';

class FakeElement extends EventTarget {
  style: Record<string, string> = {};
  classList = {
    values: new Set<string>(),
    add: (name: string) => { this.classList.values.add(name); },
    remove: (name: string) => { this.classList.values.delete(name); },
    contains: (name: string) => this.classList.values.has(name),
  };
  captures = new Set<number>();
  getBoundingClientRect() { return { left: 0, top: 0, width: 844, height: 390 }; }
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
  append() {}
  remove() {}
}
class FakeDocument extends EventTarget {
  visibilityState = 'visible';
  body = new FakeElement();
  createElement() { return new FakeElement(); }
}
class FakeWindow extends EventTarget {
  getComputedStyle() { return { paddingLeft: '0px', paddingRight: '0px', paddingBottom: '0px' }; }
}
function pointer(type: string, id: number, x = 0, y = 0): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: id }, clientX: { value: x }, clientY: { value: y },
  });
  return event;
}
function fixture() {
  const controls = {
    surface: new FakeElement(), joystickBase: new FakeElement(), joystickKnob: new FakeElement(),
    attack: new FakeElement(), punch: new FakeElement(), dash: new FakeElement(),
  };
  const sink: MobileCombatSink = {
    setInput: vi.fn<(stick: StickVector, basicHeld: boolean) => void>(),
    punch: vi.fn(), dash: vi.fn(), resetInput: vi.fn(),
  };
  const win = new FakeWindow();
  const doc = new FakeDocument();
  const bridge = new RebirthMobileCombatBridge(
    controls as unknown as ConstructorParameters<typeof RebirthMobileCombatBridge>[0],
    sink, win as unknown as Window, doc as unknown as Document,
  );
  return { controls, sink, bridge, win, doc };
}

describe('Rebirth mobile HUD combat bridge', () => {
  it('positions joystick and three controls within landscape viewport', () => {
    const f = fixture();
    for (const button of [f.controls.attack, f.controls.punch, f.controls.dash]) {
      expect(parseFloat(button.style.left)).toBeGreaterThan(0);
      expect(parseFloat(button.style.left)).toBeLessThan(844);
      expect(parseFloat(button.style.top)).toBeGreaterThan(0);
      expect(parseFloat(button.style.top)).toBeLessThan(390);
      expect(button.style.touchAction).toBe('none');
    }
    f.bridge.dispose();
  });
  it('transmits joystick vector and resets on release', () => {
    const f = fixture();
    const baseX = parseFloat(f.controls.joystickBase.style.left);
    const baseY = parseFloat(f.controls.joystickBase.style.top);
    f.controls.surface.dispatchEvent(pointer('pointerdown', 1, baseX, baseY));
    f.controls.surface.dispatchEvent(pointer('pointermove', 1, baseX + 45, baseY));
    expect(vi.mocked(f.sink.setInput).mock.lastCall?.[0].magnitude).toBeGreaterThan(0);
    f.controls.surface.dispatchEvent(pointer('pointerup', 1, baseX + 45, baseY));
    expect(vi.mocked(f.sink.setInput).mock.lastCall?.[0].magnitude).toBe(0);
    f.bridge.dispose();
  });
  it('holds basic while finger is down and releases without blocking joystick', () => {
    const f = fixture();
    f.controls.attack.dispatchEvent(pointer('pointerdown', 2));
    expect(vi.mocked(f.sink.setInput).mock.lastCall?.[1]).toBe(true);
    expect(f.controls.attack.classList.contains('pressed')).toBe(true);
    f.controls.attack.dispatchEvent(pointer('pointerup', 2));
    expect(vi.mocked(f.sink.setInput).mock.lastCall?.[1]).toBe(false);
    expect(f.controls.attack.classList.contains('pressed')).toBe(false);
    f.bridge.dispose();
  });
  it('punch and dash fire independently from the left thumb', () => {
    const f = fixture();
    f.controls.punch.dispatchEvent(pointer('pointerdown', 3));
    f.controls.dash.dispatchEvent(pointer('pointerdown', 4));
    expect(f.sink.punch).toHaveBeenCalledTimes(1);
    expect(f.sink.dash).toHaveBeenCalledTimes(1);
    f.bridge.dispose();
  });
  it('blur and visibility changes cancel held actions', () => {
    const f = fixture();
    f.controls.attack.dispatchEvent(pointer('pointerdown', 5));
    f.win.dispatchEvent(new Event('blur'));
    expect(f.sink.resetInput).toHaveBeenCalled();
    expect(f.controls.attack.classList.contains('pressed')).toBe(false);
    f.controls.attack.dispatchEvent(pointer('pointerdown', 6));
    f.doc.visibilityState = 'hidden';
    f.doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.controls.attack.classList.contains('pressed')).toBe(false);
    f.bridge.dispose();
  });
  it('resizes without accumulating listeners and disposes safely', () => {
    const f = fixture();
    f.win.dispatchEvent(new Event('resize'));
    const previous = vi.mocked(f.sink.punch).mock.calls.length;
    f.bridge.dispose();
    f.controls.punch.dispatchEvent(pointer('pointerdown', 7));
    expect(f.sink.punch).toHaveBeenCalledTimes(previous);
  });
});
