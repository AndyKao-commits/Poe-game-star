/** Chapter 1B: B2 garage threshold. Narrative exploration runs without
 * borrowed or placeholder artwork while the dedicated parking art is produced.
 * All choices are explicit, deterministic and replay-safe.
 */
export type GarageStep = 'entrance' | 'security' | 'voices' | 'workshop';
export type GarageAction = 'inspect-seal' | 'listen' | 'follow-cable' | 'enter';
export interface GarageState {
  step: GarageStep;
  evidence: readonly string[];
  complete: boolean;
}
export interface GarageView {
  title: string;
  story: string;
  actions: readonly { id: GarageAction; label: string }[];
}
export const initialGarageState = (): GarageState => ({ step: 'entrance', evidence: [], complete: false });

export function garageView(state: GarageState): GarageView {
  switch (state.step) {
    case 'entrance': return {
      title: 'B2 地下停車場',
      story: '鐵捲門沒有完全關上。地上有拖行的痕跡，空氣裡殘留刺鼻的魔力絕緣漆味。阿澤：「我只是出門買個宵夜耶。」',
      actions: [
        { id: 'inspect-seal', label: '檢查破損的設備封條' },
        { id: 'listen', label: '先聽聽裡面的動靜' },
      ],
    };
    case 'security': return {
      title: '封條上的編號',
      story: '破裂的封條印著「B2／增幅器測試」。序號被人刻意刮去一半；旁邊還有一張不屬於停車場的出入證。',
      actions: [{ id: 'listen', label: '循著聲音繼續調查' }],
    };
    case 'voices': return {
      title: '有人被困在裡面',
      story: '通風管傳出壓低的對話：「再測一次就放我們走？」另一人回答：「不要碰那台，會超載。」阿澤收起玩笑。',
      actions: [{ id: 'follow-cable', label: '沿著供電纜線尋找入口' }],
    };
    case 'workshop': return {
      title: '非法增幅器工坊入口',
      story: '纜線通向一道加裝電子鎖的鐵門。裡面傳來設備過載警報，受困者還在等人幫忙。下一段工坊場景正在製作。',
      actions: state.complete ? [] : [{ id: 'enter', label: '記錄位置，準備進入工坊' }],
    };
  }
}

export function advanceGarage(state: GarageState, action: GarageAction): GarageState {
  if (state.complete) return state;
  const valid = garageView(state).actions.some(choice => choice.id === action);
  if (!valid) throw new Error('Invalid garage investigation action');
  if (action === 'inspect-seal') return {
    step: 'security', evidence: [...state.evidence, 'B2 增幅器測試封條'], complete: false,
  };
  if (action === 'listen') return {
    step: 'voices', evidence: state.evidence, complete: false,
  };
  if (action === 'follow-cable') return {
    step: 'workshop', evidence: [...state.evidence, '受困測試者的求救聲'], complete: false,
  };
  return { ...state, complete: true };
}
