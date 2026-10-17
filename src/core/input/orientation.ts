export type PlayOrientation = 'landscape' | 'portrait';

export function detectPlayOrientation(
  width: number,
  height: number,
): PlayOrientation {
  return width >= height ? 'landscape' : 'portrait';
}

export function shouldShowTouchControls(opts: {
  orientation: PlayOrientation;
  coarsePointer: boolean;
  forceTouch?: boolean;
}): boolean {
  if (opts.forceTouch) return opts.orientation === 'landscape';
  return opts.coarsePointer && opts.orientation === 'landscape';
}

export function shouldShowRotatePrompt(orientation: PlayOrientation): boolean {
  return orientation === 'portrait';
}
