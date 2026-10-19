import type { AlleyObjectivePhase } from './alleyObjective';

export interface AlleyDialogueCue {
  speaker: '阿澤' | '混混';
  text: string;
}

/** Short, non-blocking story captions for the first guided encounter.
 * No new actor art is implied: captions only play over the actual encounter.
 * Times are relative to the moment the current mission phase begins.
 */
const CUES: Readonly<Record<AlleyObjectivePhase, readonly {
  untilMs: number;
  cue: AlleyDialogueCue;
}[]>> = {
  fight: [
    { untilMs: 2400, cue: { speaker: '阿澤', text: '我只是想買個宵夜，還得順便處理勒索？' } },
    { untilMs: 4400, cue: { speaker: '混混', text: '少管閒事！' } },
    { untilMs: 6700, cue: { speaker: '阿澤', text: '好喔，那我就多管一下。' } },
  ],
  'reach-exit': [
    { untilMs: 2500, cue: { speaker: '阿澤', text: '總算安靜了……那傢伙剛才說地下停車場？' } },
    { untilMs: 5100, cue: { speaker: '阿澤', text: '宵夜先等等，去巷口看看。' } },
  ],
  complete: [],
  defeated: [],
};

export function alleyDialogueAt(
  phase: AlleyObjectivePhase, elapsedMs: number,
): AlleyDialogueCue | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid dialogue time');
  const entry = CUES[phase].find(line => elapsedMs < line.untilMs);
  return entry ? { ...entry.cue } : null;
}
