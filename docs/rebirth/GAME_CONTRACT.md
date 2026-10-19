# Ashen Reliquary: Rebirth — CANONICAL GAME CONTRACT
Version: GDD v0.7.2 (2026-10-19)
Status: APPROVED BASELINE / implementation details may evolve
Owner decision: autonomous development permitted, preserve consistency and reversibility.

## 0. Source of truth / priority
1. Explicit latest user decisions supersede older discussion and this document.
2. This contract is the authoritative baseline for Rebirth, not old Ashen Reliquary documentation.
3. Accepted technical specs and passing tests may refine implementation, but may not silently change core pillars.
4. Proposals are not approved canon until marked APPROVED in a decision log or explicitly approved by user.
5. Never report unverified implementation, QA, commits, or deployment as complete.

## 1. Locked game identity (LOCKED)
- Title: Ashen Reliquary: Rebirth.
- Personal/noncommercial indie game; prioritize cohesive playable quality over scale.
- Setting: fictional contemporary Taiwan, familiar urban environments (alleyways, convenience stores, scooters, apartments, parking garages, workshops).
- Everyone can learn/use magic; magic is normal, regulated, teachable, measurable, and integrated with technology.
- Magic is its OWN secular, culture-independent system. No Taiwanese folklore, religion, talismans, temples or ethnic bloodlines as the source of magic. Avoid accidentally reintroducing previous ancient-ruin/reliquary setting as central lore.
- Tone: humor and serious stakes. Sarcastic/talkative civilian protagonist who intervenes against magical criminals, uses extralegal vigilante force; story acknowledges legal and moral consequences, without glorifying cruelty.
- Enemies identified by harmful actions, not by clothing or social identity. Street criminals and illegal magical enhancement industry, with room for more complex antagonists.
- Chapter 1: 「只是想買個宵夜」: after-work convenience store -> alley extortion incident -> underground parking garage -> illegal magic amplifier workshop -> boss 阿彪 -> fight video goes viral / police attention -> return to safehouse.
- Main characters in current proposal: protagonist 阿澤 (working name, not final player name), friend 小晴, food stall owner 陳老闆, investigator 許警官, boss 阿彪.
- Play target: mobile browser URL-to-play, iPhone Safari + Android Chrome, LANDSCAPE-FIRST.
- Game: single-player 2D stylized low-resolution urban fantasy action RPG with exploration and hybrid roguelite progression.
- Persistent: equipment, brought-back resources, safehouse upgrades, story progress. Run-only: random magical boosts and temporary run effects.
- Combat UI: left virtual joystick, right basic attack (hold repeat) + 2 skills; auto-target assist, clear telegraphs, touch-friendly responsive safe areas.
- Run length target: 5–10 min repeat runs, first guided chapter ~12–16 min (targets, not promises).
- Do not merge into main or production deploy without explicit approval. Historical archive branches are excluded from Rebirth work and must not be consulted; repository history remains available for disaster recovery only, not design input.

## 2. Chapter 1 script / narrative beats (APPROVED DIRECTION, dialogue editable)
A. Late night: protagonist leaves work at 23:40, texts with 小晴, buys noodles, drink and toilet paper; comedy from mundane magic.
B. Alley: criminals extort 陳老闆 and threaten property using magic; protagonist sarcastically intervenes. Tutorial move/basic/skill1/skill2.
C. Parking garage: traces illegal amplifier label to hidden facility, discovers victims coerced to test devices. Humor recedes when stakes become clear.
D. Illegal workshop: technicians under duress; acquire first persistent casting medium.
E. Boss 阿彪: powerful but reckless illegal amplifier user; phase 2 overload exposes weak point.
F. Evidence handed to police; vigilante video circulates; 許警官 publicly warns against private violence. Safehouse unlock. Punchline: ruined midnight snack.
G. Post-credit hint: someone is surprised by protagonist's power without an amplifier.
Writing constraints: conversational Taiwan Mandarin, sarcastic without constant profanity; stop joking during serious harm; no gratuitous violence; maintain moral ambiguity.

## 3. Combat prototype balance (PROVISIONAL, not locked)
Player: HP120, MP60, ATK12, DEF4, movement150 world units/s, basic interval0.45s, crit5%, crit multiplier1.5, MP regen4/s after 2s no casting.
Damage = max(1, floor(ATK * skillMultiplier * 100/(100+5*targetDEF))); critical x1.5 then floor.
Basic 100% ATK, 0 MP, 0.45s.
Skill1 魔力衝拳 220% ATK, 15 MP, 5s cooldown, small knockback.
Skill2 瞬步 dash100 units, 10 MP, 7s cooldown, proposed 0.2s invulnerability subject to mobile playtest.
Enemies:
- 火拳混混 HP45 ATK9 DEF1; 0.5s telegraph, 0.8s recovery.
- 電擊仔 HP35 ATK8 DEF0; ranged bolt, 0.8s telegraph.
- 結界打手 HP70 ATK7 DEF4; front shield ~3s, flank vulnerability.
- Boss 阿彪 HP420 ATK14 DEF5; phase transition at 60% HP, amplifier weakness bonus damage 50%.
Boss moves: 重拳 telegraph0.8s dmg18 recovery1s; 衝撞 telegraph1s dmg22 wall recovery1.5s; 震波 telegraph1.2s dmg16 recovery0.8s; 超載爆發 telegraph1.5s dmg28 recovery2s.
These are starting hypotheses, revise only with test evidence and log the change.

## 4. Progression / level content (BASELINE)
- First slice: Taiwanese alley, parking garage, illegal amplifier workshop, small safehouse.
- 3 ordinary enemy archetypes + 1 boss, one playable protagonist, 2 active skills.
- Permanent slots: weapon, armor, casting medium.
- Safehouse facilities: equipment workbench, magic research desk, intelligence computer.
- Six provisional run boosts: 火力增幅 +15% basic damage; 魔力回收 +5 MP on kill; 迅捷施法 -15% skill cooldown; 防禦結界 first damage each room -30%; 連鎖電流 15% basic attack chance to chain; 緊急恢復 once per run heal when HP<30% (amount TBD).
- Death: persistent banked gear/resources/upgrades/story remain; run-only boosts disappear. Unbanked ordinary materials retention TBD; never delete permanent items.
- Branching encounter/loot/event rooms after guided opening; deterministic seeds where practical for testing.

## 5. Art and UX contract (BASELINE)
- Cohesive stylized 2D / polished low-res, not photorealism, not random mismatched AI imagery.
- Taiwanese urban setting details; magic VFX = geometric energy, particles, modern devices; NO folklore or religious motifs.
- Initial reference canvas 480x270, 32x32 environment tile, ~32x48 player sprite, but final sizes depend on actual device legibility.
- HUD must use screen-space legible sizing, not blindly scale with world pixel resolution.
- Touch safe-area and varying aspect ratios; orientation hint rather than relying on browser orientation lock.
- Clear silhouette, enemy telegraphs, hit-stop/impact feedback, cooldown and insufficient-MP indicators.
- iPhone Safari and Android Chrome QA; aim 60fps with lower-spec 30fps fallback, measure instead of claiming.

## 6. Engineering governance / protection (LOCKED)
- Work only on isolated Rebirth branch feat/rebirth-v1 (or a successor dedicated Rebirth branch); do not modify legacy branches or main.
- Rebirth implementation must be designed from this contract and Rebirth-owned specifications ONLY. Do not inspect, copy, consult, or use legacy game code, design, artwork, story, tests or archived branches as implementation references. Generic technologies (Phaser 3, TypeScript, Vite) may be used, but not legacy-specific implementations.
- Each work cycle: (1) read this contract, (2) inspect current branch/head and previous changes, (3) choose ONE bounded task, (4) implement, (5) run feasible checks, (6) record what actually passed/failed, (7) note next task.
- Before writing: check for existing file and branch state; avoid overwrite or racing parallel tasks. Preserve save compatibility/versioning and avoid destructive migrations.
- No legacy lore, sprites, tiles, combat defaults, UI, map, animation or gameplay logic may appear in the Rebirth runtime. No placeholder/temporary/proxy artwork is permitted in Rebirth previews or playable builds; create and review purpose-made Rebirth assets before activating dependent scenes. Unfinished art blocks the corresponding feature or release rather than being replaced by legacy/temporary visuals.
- Code changes should be reversible, focused, and tracked with commits and test evidence.
- Do not silently change LOCKED pillars. For significant new design proposals, record them as PROPOSED and seek user decision.
- No unapproved main merge, destructive operation, production deployment, or fake success claims.
- Hourly automation is authorized to work on Rebirth; legacy hourly checks remain disabled.

## 7. Delivery acceptance gates
G0 contract versioned and branch isolated.
G1 landscape mobile viewport/HUD and touch input works on actual target devices.
G2 player attacks/skills/enemy telegraphs/damage/death work and tests pass.
G3 exploration/loot/run boosts/retry loop works.
G4 permanent inventory/safehouse/IndexedDB versioned save and migration tests.
G5 chapter script integration, coherent art, sound, performance, iOS Safari + Android Chrome QA.
No gate is complete until evidence is recorded. Compilation alone != mobile QA.

## 8. Change-control log
- 2026-10-19 v0.7.1: Created canonical baseline based on confirmed user choices, replacing prior folklore/ancient-magic storyline. No gameplay implementation claimed.
- 2026-10-19 v0.7.2 APPROVED by owner: prohibit all placeholder artwork and any legacy-game reference or runtime dependency; Rebirth contract is sole design source. Scope: game art, runtime architecture, workflow and QA. Rollback: revert this contract change only with a new explicit owner decision. Existing Rebirth runtime is NONCOMPLIANT until audited and replaced; no readiness claim.
- Subsequent changes must append: date, proposed/approved status, why, affected systems, tests, rollback plan.
