/** Chapter 1B: B2 garage threshold. Narrative exploration runs without
 * borrowed or placeholder artwork while the dedicated parking art is produced.
 * All choices are explicit, deterministic and replay-safe.
 */
export type GarageStep = 'entrance' | 'security' | 'voices' | 'power' | 'workshop' | 'door';
export type GarageAction =
  | 'inspect-seal' | 'listen' | 'inspect-panel' | 'isolate-test'
  | 'cut-ventilation' | 'leave-panel' | 'follow-cable' | 'inspect-lock'
  | 'decode-label' | 'force-door' | 'return-workshop' | 'enter';
export interface GarageState {
  step: GarageStep;
  evidence: readonly string[];
  complete: boolean;
  /** Set only after an unsafe choice is intercepted; no damage is inflicted. */
  warning?: string;
  /** Optional stealth entry preserves evidence and prevents an alarm. */
  quietEntry?: boolean;
}
export interface GarageView {
  title: string;
  story: string;
  actions: readonly { id: GarageAction; label: string }[];
}
export const initialGarageState = (): GarageState => ({ step: 'entrance', evidence: [], complete: false });

const POWER_EVIDENCE = '已隔離非法增幅器測試迴路';
const SEAL_EVIDENCE = 'B2 增幅器測試封條';
const LOCK_EVIDENCE = '電子鎖的維護識別碼';

/** Outcome is derived from actual decisions; never inferred from UI labels. */
export function garageOutcome(state: GarageState): { rank: 'A' | 'B' | 'C'; summary: string } | null {
  if (!state.complete) return null;
  const isolated = state.evidence.includes(POWER_EVIDENCE);
  const quiet = state.quietEntry === true;
  if (isolated && quiet) return { rank: 'A', summary: '已安全隔離測試迴路、保留排風，並靜默開啟工坊入口。受困者獲得更多撤離時間。' };
  if (isolated || quiet) return { rank: 'B', summary: isolated
    ? '已隔離測試迴路，但開門時觸發警報。工坊內的人已察覺動靜。'
    : '已靜默開門，但非法增幅器仍在運作。進入後須優先處理設備。' };
  return { rank: 'C', summary: '強行進入觸發警報，增幅器仍在供電。工坊敵人已經有所防備。' };
}


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
    case 'voices': {
      const isolated = state.evidence.includes(POWER_EVIDENCE);
      return {
        title: '有人被困在裡面',
        story: '通風管傳出壓低的對話：「再測一次就放我們走？」另一人回答：「不要碰那台，會超載。」阿澤收起玩笑。' +
          (isolated ? ' 增幅器測試供電已隔離，緊急排風仍正常運轉。' : ''),
        actions: [
          ...(!isolated ? [{ id: 'inspect-panel' as const, label: '查看牆邊的配電箱' }] : []),
          { id: 'follow-cable', label: '沿著供電纜線尋找入口' },
        ],
      };
    }
    case 'power': return {
      title: '配電箱：分辨安全迴路',
      story: '箱門上標示 A：停車場照明、B：增幅器測試、C：緊急排風。受困者需要排風，不能貿然斷電。' +
        (state.warning ? ' ' + state.warning : ''),
      actions: [
        { id: 'isolate-test', label: '只隔離 B：增幅器測試' },
        { id: 'cut-ventilation', label: '嘗試切斷 C：緊急排風' },
        { id: 'leave-panel', label: '先離開配電箱' },
      ],
    };
    case 'workshop': {
      const isolated = state.evidence.includes(POWER_EVIDENCE);
      return {
        title: '非法增幅器工坊入口',
        story: '纜線通向一道加裝電子鎖的鐵門。裡面傳來設備過載警報，受困者還在等人幫忙。' +
          (isolated ? ' 測試迴路已隔離，警報逐漸減弱。' : ' 測試迴路仍在供電，必須小心。') +
          ' 下一段工坊場景正在製作。',
        actions: state.complete ? [] : [
          { id: 'inspect-lock', label: '調查電子鎖與維護介面' },
          { id: 'enter', label: '直接推開鐵門（會觸發警報）' },
        ],
      };
    }
    case 'door': return {
      title: '電子鎖：維護模式',
      story: '電子鎖的警報指示燈正在閃爍。維護介面要求讀取 B2 測試封條上的設備編號。' +
        (state.evidence.includes(SEAL_EVIDENCE)
          ? ' 阿澤認出封條的殘留序號，可以在不觸發警報的情況下解鎖。'
          : ' 目前沒有設備編號，強行開門會通知工坊裡的人。'),
      actions: [
        ...(state.evidence.includes(SEAL_EVIDENCE)
          ? [{ id: 'decode-label' as const, label: '使用封條編號靜默解鎖' }] : []),
        { id: 'force-door', label: '強制解除電子鎖（觸發警報）' },
        { id: 'return-workshop', label: '退回入口觀察' },
      ],
    };
  }
}

export function advanceGarage(state: GarageState, action: GarageAction): GarageState {
  if (state.complete) return state;
  const valid = garageView(state).actions.some(choice => choice.id === action);
  if (!valid) throw new Error('Invalid garage investigation action');
  if (action === 'inspect-seal') return {
    step: 'security', evidence: [...state.evidence, SEAL_EVIDENCE], complete: false,
  };
  if (action === 'listen') return { step: 'voices', evidence: state.evidence, complete: false };
  if (action === 'inspect-panel') return { step: 'power', evidence: state.evidence, complete: false };
  if (action === 'cut-ventilation') return {
    ...state, warning: '這會讓受困者失去排風！阿澤停下手，沒有切斷 C 迴路。',
  };
  if (action === 'leave-panel') return { step: 'voices', evidence: state.evidence, complete: false };
  if (action === 'isolate-test') return {
    step: 'voices', evidence: [...state.evidence, POWER_EVIDENCE], complete: false,
  };
  if (action === 'follow-cable') return {
    step: 'workshop', evidence: [...state.evidence, '受困測試者的求救聲'], complete: false,
  };
  if (action === 'inspect-lock') return { ...state, step: 'door' };
  if (action === 'return-workshop') return { ...state, step: 'workshop' };
  if (action === 'decode-label') return {
    ...state, step: 'workshop', complete: true, quietEntry: true,
    evidence: [...state.evidence, LOCK_EVIDENCE],
  };
  if (action === 'force-door') return { ...state, step: 'workshop', complete: true, quietEntry: false };
  return { ...state, complete: true, quietEntry: false };
}
