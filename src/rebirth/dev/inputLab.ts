import {
  movementVelocity, touchControlLayout, type Point, type TouchControlLayout,
} from '../input/touchControls';
import { RebirthJoystickController } from '../input/joystickController';
import { RebirthJoystickPointerAdapter } from '../input/joystickPointerAdapter';

const surface = document.getElementById('surface') as HTMLElement;
const base = document.getElementById('stick-base') as HTMLElement;
const knob = document.getElementById('stick-knob') as HTMLElement;
const avatar = document.getElementById('avatar') as HTMLElement;
const status = document.getElementById('status') as HTMLElement;
const modeButton = document.getElementById('mode') as HTMLButtonElement;
const actions = [
  document.getElementById('attack') as HTMLElement,
  document.getElementById('skill1') as HTMLElement,
  document.getElementById('skill2') as HTMLElement,
];
if (!surface || !base || !knob || !avatar || !status || !modeButton || actions.some(x => !x)) {
  throw new Error('Incomplete Rebirth input lab markup');
}

let layout: TouchControlLayout;
let controller: RebirthJoystickController;
let adapter: RebirthJoystickPointerAdapter;
let mode: 'fixed' | 'floating' = 'fixed';
let avatarPosition: Point = { x: innerWidth / 2, y: innerHeight / 2 };
let lastFrame = performance.now();
let actionCount = [0, 0, 0];
const actionOwners = new Map<number, number>();

function safeInsets(): { left: number; right: number; bottom: number } {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const result = {
    left: parseFloat(style.paddingLeft) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
  };
  probe.remove();
  return result;
}

function place(element: HTMLElement, center: Point, diameter: number): void {
  element.style.left = center.x + 'px';
  element.style.top = center.y + 'px';
  element.style.width = diameter + 'px';
  element.style.height = diameter + 'px';
}

function renderStick(): void {
  const snapshot = controller.snapshot();
  place(base, snapshot.center, layout.joystickRadius * 2);
  place(knob, {
    x: snapshot.center.x + snapshot.stick.x * layout.joystickRadius * 0.65,
    y: snapshot.center.y + snapshot.stick.y * layout.joystickRadius * 0.65,
  }, layout.joystickRadius * 0.82);
}

function setup(): void {
  if (adapter) adapter.dispose();
  const rect = surface.getBoundingClientRect();
  layout = touchControlLayout(rect.width, rect.height, safeInsets());
  controller = new RebirthJoystickController(layout.joystickCenter, {
    radius: layout.joystickRadius,
    deadZone: 0.16,
    captureRadius: layout.joystickRadius * 1.3,
  }, mode);
  adapter = new RebirthJoystickPointerAdapter(surface, controller, renderStick);
  [layout.basicAttackCenter, layout.skillOneCenter, layout.skillTwoCenter].forEach(
    (center, index) => place(actions[index], center, layout.actionRadius * 2),
  );
  actionOwners.clear();
  avatarPosition = {
    x: Math.max(24, Math.min(rect.width - 24, avatarPosition.x)),
    y: Math.max(24, Math.min(rect.height - 24, avatarPosition.y)),
  };
  renderStick();
}

function localPoint(event: PointerEvent): Point {
  const rect = surface.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function actionIndex(point: Point): number {
  const centers = [layout.basicAttackCenter, layout.skillOneCenter, layout.skillTwoCenter];
  return centers.findIndex(center => Math.hypot(center.x - point.x, center.y - point.y) <= layout.actionRadius);
}

surface.addEventListener('pointerdown', event => {
  if (controller.snapshot().pointerId === event.pointerId) return;
  const index = actionIndex(localPoint(event));
  if (index < 0) return;
  actionOwners.set(event.pointerId, index);
  actionCount[index]++;
  actions[index].style.background = '#4c91b9';
  event.preventDefault();
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  surface.addEventListener(eventName, event => {
    const index = actionOwners.get((event as PointerEvent).pointerId);
    if (index === undefined) return;
    actionOwners.delete((event as PointerEvent).pointerId);
    if (![...actionOwners.values()].includes(index)) actions[index].style.background = '';
  });
}
window.addEventListener('blur', () => {
  actionOwners.clear();
  actions.forEach(action => { action.style.background = ''; });
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    actionOwners.clear();
    actions.forEach(action => { action.style.background = ''; });
  }
});

modeButton.addEventListener('click', () => {
  mode = mode === 'fixed' ? 'floating' : 'fixed';
  modeButton.textContent = mode === 'fixed' ? '固定搖桿' : '浮動搖桿';
  adapter.setMode(mode);
  renderStick();
});
window.addEventListener('resize', setup);
window.addEventListener('orientationchange', setup);
setup();

function frame(now: number): void {
  const delta = Math.min(50, Math.max(0, now - lastFrame));
  lastFrame = now;
  const snapshot = controller.snapshot();
  const velocity = movementVelocity(snapshot.stick);
  const rect = surface.getBoundingClientRect();
  avatarPosition.x = Math.max(12, Math.min(rect.width - 12, avatarPosition.x + velocity.x * delta / 1000));
  avatarPosition.y = Math.max(12, Math.min(rect.height - 12, avatarPosition.y + velocity.y * delta / 1000));
  avatar.style.left = avatarPosition.x + 'px';
  avatar.style.top = avatarPosition.y + 'px';
  status.textContent = `模式:${mode} 移動:${snapshot.stick.magnitude.toFixed(2)} 攻擊:${actionCount[0]} 技1:${actionCount[1]} 技2:${actionCount[2]}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
