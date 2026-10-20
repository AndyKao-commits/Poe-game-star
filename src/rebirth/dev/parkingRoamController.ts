import type { Vec2 } from '../../core/iso/coordinates';
import {
  createParkingGarageMap,
  type GarageLandmarkId,
  type ParkingGarageBlueprint,
} from '../map/parkingGarage';
import {
  initialParkingRoam,
  interactParkingRoam,
  stepParkingRoam,
  type ParkingRoamInput,
  type ParkingRoamState,
} from './parkingRoam';

export interface ParkingRoamSnapshot {
  readonly position: Vec2;
  readonly facing: Vec2;
  readonly nearbyLandmark: GarageLandmarkId | null;
  readonly interactionLabel: string | null;
  readonly garageStep: ParkingRoamState['garage']['step'];
  readonly evidence: readonly string[];
}

const INTERACTION_LABELS: Readonly<Record<GarageLandmarkId, string>> = {
  seal: '調查測試封條',
  'power-panel': '檢查配電箱',
  cable: '沿著纜線調查',
  'electronic-lock': '調查電子鎖',
};

/**
 * Scene-facing bridge for B2. It owns no rendering and no art fallback; a
 * Phaser scene can consume the snapshot and bind approved original assets.
 */
export class ParkingRoamController {
  private state: ParkingRoamState;
  private lastNowMs: number | null = null;

  constructor(readonly blueprint: ParkingGarageBlueprint = createParkingGarageMap()) {
    this.state = initialParkingRoam(blueprint);
  }

  tick(input: ParkingRoamInput, nowMs: number): ParkingRoamSnapshot {
    if (!Number.isFinite(nowMs) || nowMs < 0 ||
        (this.lastNowMs !== null && nowMs < this.lastNowMs)) {
      throw new Error('Nonmonotonic B2 roam time');
    }
    const deltaMs = this.lastNowMs === null ? 0 : nowMs - this.lastNowMs;
    this.state = stepParkingRoam(this.state, input, deltaMs, this.blueprint);
    this.lastNowMs = nowMs;
    return this.snapshot();
  }

  interact(): ParkingRoamSnapshot {
    this.state = interactParkingRoam(this.state, this.blueprint);
    return this.snapshot();
  }

  reset(): ParkingRoamSnapshot {
    this.state = initialParkingRoam(this.blueprint);
    this.lastNowMs = null;
    return this.snapshot();
  }

  snapshot(): ParkingRoamSnapshot {
    return {
      position: { ...this.state.position },
      facing: { ...this.state.facing },
      nearbyLandmark: this.state.nearbyLandmark,
      interactionLabel: this.state.nearbyLandmark
        ? INTERACTION_LABELS[this.state.nearbyLandmark]
        : null,
      garageStep: this.state.garage.step,
      evidence: [...this.state.garage.evidence],
    };
  }
}
