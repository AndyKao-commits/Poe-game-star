import { moveWithCollision } from '../../core/collision/grid';
import type { Vec2 } from '../../core/iso/coordinates';
import {
  advanceGarage,
  initialGarageState,
  type GarageAction,
  type GarageState,
} from './parkingInvestigation';
import {
  createParkingGarageMap,
  nearestGarageLandmark,
  type GarageLandmarkId,
  type ParkingGarageBlueprint,
} from '../map/parkingGarage';

export interface ParkingRoamInput {
  readonly x: number;
  readonly y: number;
  readonly interact: boolean;
}

export interface ParkingRoamState {
  readonly position: Vec2;
  readonly facing: Vec2;
  readonly nearbyLandmark: GarageLandmarkId | null;
  readonly garage: GarageState;
}

const WALK_SPEED = 3.8;

export function initialParkingRoam(blueprint: ParkingGarageBlueprint = createParkingGarageMap()): ParkingRoamState {
  return {
    position: { ...blueprint.playerSpawn },
    facing: { x: 1, y: 0 },
    nearbyLandmark: nearestGarageLandmark(blueprint, blueprint.playerSpawn),
    garage: initialGarageState(),
  };
}

export function stepParkingRoam(
  state: ParkingRoamState,
  input: ParkingRoamInput,
  deltaMs: number,
  blueprint: ParkingGarageBlueprint = createParkingGarageMap(),
): ParkingRoamState {
  if (![input.x, input.y, deltaMs].every(Number.isFinite) || deltaMs < 0) {
    throw new Error('Invalid B2 roam input');
  }
  const length = Math.hypot(input.x, input.y);
  const direction = length > 1 ? { x: input.x / length, y: input.y / length } : { x: input.x, y: input.y };
  const moved = moveWithCollision(blueprint.map, state.position, {
    x: direction.x * WALK_SPEED * Math.min(deltaMs, 50) / 1000,
    y: direction.y * WALK_SPEED * Math.min(deltaMs, 50) / 1000,
  });
  const facing = length > 0.08 ? direction : state.facing;
  return {
    ...state,
    position: moved,
    facing,
    nearbyLandmark: nearestGarageLandmark(blueprint, moved),
  };
}

const INTERACTION_BY_LANDMARK: Readonly<Record<GarageLandmarkId, GarageAction>> = {
  seal: 'inspect-seal',
  'power-panel': 'inspect-panel',
  cable: 'follow-cable',
  'electronic-lock': 'inspect-lock',
};

/** Applies only the interaction valid for the current narrative step. */
export function interactParkingRoam(
  state: ParkingRoamState,
  blueprint: ParkingGarageBlueprint = createParkingGarageMap(),
): ParkingRoamState {
  const landmark = nearestGarageLandmark(blueprint, state.position);
  if (!landmark) return state;
  const action = INTERACTION_BY_LANDMARK[landmark];
  const available = state.garage.step !== 'door' && state.garage.step !== 'security'
    && state.garage.step !== 'power' && state.garage.step !== 'voices' && state.garage.step !== 'workshop'
    ? state.garage.step === 'entrance' && action === 'inspect-seal'
    : state.garage.step === 'voices'
      ? action === 'inspect-panel' || action === 'follow-cable'
      : state.garage.step === 'workshop' && action === 'inspect-lock';
  if (!available) return state;
  return { ...state, garage: advanceGarage(state.garage, action) };
}
