export type PlayerAnimState = 'idle' | 'run' | 'attack' | 'dead';
export type EnemyAnimState =
  | 'idle'
  | 'chase'
  | 'windup'
  | 'attack'
  | 'recovery'
  | 'hurt'
  | 'dead';

export interface StateMachine<T extends string> {
  state: T;
  tryTransition(next: T): boolean;
  force(next: T): void;
}

type TransitionMap<T extends string> = Partial<Record<T, readonly T[]>>;

export function createStateMachine<T extends string>(
  initial: T,
  allowed: TransitionMap<T>,
): StateMachine<T> {
  let state = initial;
  return {
    get state() {
      return state;
    },
    tryTransition(next: T) {
      if (next === state) return true;
      const options = allowed[state];
      if (!options || !options.includes(next)) return false;
      state = next;
      return true;
    },
    force(next: T) {
      state = next;
    },
  };
}

export function createPlayerStateMachine(): StateMachine<PlayerAnimState> {
  return createStateMachine<PlayerAnimState>('idle', {
    idle: ['run', 'attack', 'dead'],
    run: ['idle', 'attack', 'dead'],
    attack: ['idle', 'run', 'dead'],
    dead: [],
  });
}

export function createEnemyStateMachine(): StateMachine<EnemyAnimState> {
  return createStateMachine<EnemyAnimState>('idle', {
    idle: ['chase', 'windup', 'hurt', 'dead'],
    chase: ['idle', 'windup', 'hurt', 'dead'],
    windup: ['attack', 'hurt', 'dead'],
    attack: ['recovery', 'hurt', 'dead'],
    recovery: ['idle', 'chase', 'hurt', 'dead'],
    hurt: ['idle', 'chase', 'dead'],
    dead: [],
  });
}
