// 《元素决斗》战斗引擎
// 处理：抽牌/弃牌、护甲破甲判断、回合结算、胜负条件

import { ElementCard, CARD_MAP, ARMOR_TYPES, SkillType } from './cardData';
import { Level, ArmorLayer, EnemyAction, BossTraits } from './levelData';

export interface BattleState {
  // 牌库/手牌/弃牌堆
  drawPile: string[];       // 剩余牌库（卡牌ID列表）
  hand: string[];           // 手牌（卡牌ID列表）
  discardPile: string[];    // 弃牌堆（卡牌ID列表）

  // 血量
  playerHP: number;
  playerMaxHP: number;
  enemyHP: number;
  enemyMaxHP: number;

  // 护盾
  playerShield: number;     // 玩家护盾值（抵挡下次伤害）
  enemyShield: number;      // 敌人护盾值（抵挡下次伤害）
  playerDefenseDebuff: number; // 玩家防御削减（腐蚀效果）

  // 护甲系统
  currentArmorIndex: number;  // 当前护甲序列索引
  armorBroken: boolean;       // 当前护甲是否已破
  armorHP: number;            // 当前护甲耐久

  // 回合
  currentRound: number;
  maxRounds: number;
  phase: 'player' | 'enemy' | 'victory' | 'defeat';

  // 每回合出牌次数限制
  playsThisTurn: number;       // 本回合已出牌/弃牌次数
  maxPlaysPerTurn: number;     // 每回合最多出牌/弃牌次数

  // Boss特性状态
  postArmorBroken: boolean;    // 当前护甲刚被破除（激活破甲后出牌限制）

  // 催化剂状态
  catalyzed: boolean;         // 下一张牌是否被催化（不消耗回合）

  // 强化状态（敌人蓄力）
  enemyStrengthened: number;  // 敌人蓄力値（下次攻击额外伤害）

  // ── 章节Boss新机制状态 ──
  // 关5：钓爆计数器（Na护甲被水破除时触发）
  sodiumExplosionPending: boolean;
  // 关10：石灰石巡龙护甲再生计数器
  armorRegenCounter: number;   // 每3回合再生一层已破除的护甲
  armorRegenMax: number;       // 最多再生次数
  // 关15：金属炼金师活动性锁定
  activityLockActive: boolean; // 是否处于活动性锁定状态
  activityLockRounds: number;  // 锁定剩余回合数
  // 关20：元素之神氧化还原护甲
  redoxArmorState: 'oxidized' | 'reduced' | null; // 当前护甲状态

  // 日志
  battleLog: BattleLogEntry[];

  // 统计
  totalMistakes: number;      // 出错次数（打出无法破甲的牌）
  cardsPlayed: number;        // 出牌总数

  // ── 新增：能量系统 ──
  energy: number;             // 当前回合剩余能量
  maxEnergy: number;          // 每回合最大能量

  // ── 新增：极简环境系统 ──
  currentEnv: 'normal' | 'heat' | 'ignite' | 'aqueous'; // 当前战场环境
  envRoundsLeft: number;      // 当前环境剩余回合数（0=常温无限制）
}

export interface BattleLogEntry {
  round: number;
  type: 'player_play' | 'player_discard' | 'armor_break' | 'armor_fail' | 'enemy_action' | 'system' | 'skill';
  message: string;
  equation?: string;
  cardId?: string;
  damage?: number;
  isSuccess?: boolean;
}

export interface PlayCardResult {
  newState: BattleState;
  armorBroken: boolean;
  isSuccess: boolean;
  equation?: string;
  skillActivated?: SkillType;
  skillMessage?: string;
  extraTurn?: boolean;        // 催化剂效果：获得额外回合
  failureReason?: FailureReason; // 出牌失败时的教学提示
}

export interface FailureReason {
  cardName: string;       // 出的牌
  armorName: string;      // 当前护甲
  whyFailed: string;      // 为什么无法反应（一句话化学原理）
  chemPrinciple: string;  // 化学原理补充说明
  hint: string;           // 提示：应该用什么牌
}

/**
 * 根据卡牌ID和护甲ID，生成详细的失败原因说明
 * 覆盖所有卡牌×护甲的组合，基于真实化学原理
 */
export function getFailureReason(cardId: string, armorId: string): FailureReason {
  const card = CARD_MAP[cardId];
  const armor = ARMOR_TYPES[armorId];
  const cardName = card?.name ?? cardId;
  const armorName = armor?.name ?? armorId;

  // ── 专项失败原因表（cardId × armorId 精确匹配）──
  const specificReasons: Record<string, Record<string, Pick<FailureReason, 'whyFailed' | 'chemPrinciple' | 'hint'>>> = {
    // 钠牌
    'Na': {
      'Na':    { whyFailed: '钠不能与自身护甲反应', chemPrinciple: '同种物质之间不发生化学反应。钠护甲本身就是钠，无法被钠"置换"。', hint: '试试用 H₂O（水）破除钠护甲！2Na + 2H₂O → 2NaOH + H₂↑' },
      'K':     { whyFailed: '钠的活泼性弱于钾，无法置换钾护甲', chemPrinciple: '金属活动性顺序：K > Na。活动性弱的金属不能置换活动性强的金属护甲。', hint: '试试用 H₂O（水）破除钾护甲！2K + 2H₂O → 2KOH + H₂↑' },
      'Li':    { whyFailed: '钠的活泼性强于锂，但钠不能"置换"锂护甲', chemPrinciple: '置换反应需要溶液环境（如硫酸盐溶液），钠直接接触锂护甲会与空气中水分反应，不能发生金属置换。', hint: '试试用 H₂O（水）破除锂护甲！2Li + 2H₂O → 2LiOH + H₂↑' },
      'Fe':    { whyFailed: '钠不能置换铁护甲', chemPrinciple: '钠遇水剧烈反应，在溶液中不能直接置换铁。活动性顺序中Na > Fe，但钠会优先与水反应，不发生置换铁的反应。', hint: '试试用 HCl（盐酸）破除铁护甲！Fe + 2HCl → FeCl₂ + H₂↑' },
      'Cu':    { whyFailed: '钠不能置换铜护甲', chemPrinciple: '钠遇水先生成NaOH，NaOH不与铜反应。钠不能在溶液中直接置换铜。', hint: '试试用 Fe（铁）破除铜护甲！Fe + CuSO₄ → FeSO₄ + Cu' },
      'NaOH':  { whyFailed: '钠与强碱NaOH不发生中和反应', chemPrinciple: '钠是金属，不是酸。中和反应需要酸与碱，钠遇NaOH溶液只会与水反应，不能中和碱护甲。', hint: '试试用 HCl（盐酸）破除NaOH护甲！NaOH + HCl → NaCl + H₂O' },
      'HCl':   { whyFailed: '钠与盐酸护甲会剧烈反应，但方向错误', chemPrinciple: '钠遇盐酸会先与水反应（Na + H₂O → NaOH + H₂↑），生成的NaOH再中和HCl，但这不是"破甲"的正确路径，游戏中需要直接用碱性牌中和酸护甲。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！NaOH + HCl → NaCl + H₂O' },
      'CaCO3': { whyFailed: '钠不能溶解石灰石护甲', chemPrinciple: '碳酸钙（石灰石）是碳酸盐，需要酸才能溶解（CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑）。钠是金属，不是酸。', hint: '试试用 HCl（盐酸）破除石灰石护甲！CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑' },
      'Fe2O3': { whyFailed: '钠不能还原铁锈护甲', chemPrinciple: '铁锈（Fe₂O₃）需要还原剂（C或H₂）在高温下才能被还原，或用酸溶解。钠是活泼金属，但不是还原铁锈的合适试剂。', hint: '试试用 C（碳）或 HCl（盐酸）破除铁锈护甲！' },
      'CO2':   { whyFailed: '钠不能直接吸收CO₂护甲', chemPrinciple: 'CO₂是酸性氧化物，需要碱（NaOH或Ca(OH)₂）来吸收。钠是金属，不是碱。', hint: '试试用 NaOH（氢氧化钠）破除CO₂护甲！2NaOH + CO₂ → Na₂CO₃ + H₂O' },
      'Al':    { whyFailed: '钠不能置换铝护甲', chemPrinciple: '铝护甲需要酸（HCl/H₂SO₄）或强碱（NaOH）才能溶解。钠不能直接置换铝。', hint: '试试用 HCl（盐酸）或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气（Ar）是稀有气体，外层电子已满，化学性质极不活泼，几乎不与任何物质发生化学反应。', hint: '稀有气体护甲无法被直接破除，只能等待或使用特殊技能牌！' },
    },
    // 钾牌
    'K': {
      'Na':    { whyFailed: '钾不能置换钠护甲', chemPrinciple: '虽然K活泼性强于Na，但钾遇水先爆炸（2K + 2H₂O → 2KOH + H₂↑），不能在溶液中直接置换钠护甲。', hint: '试试用 H₂O（水）破除钠护甲！2Na + 2H₂O → 2NaOH + H₂↑' },
      'K':     { whyFailed: '钾不能与自身护甲反应', chemPrinciple: '同种物质之间不发生化学反应。', hint: '试试用 H₂O（水）破除钾护甲！2K + 2H₂O → 2KOH + H₂↑' },
      'Li':    { whyFailed: '钾不能置换锂护甲', chemPrinciple: '虽然K活泼性强于Li，但不能在溶液中直接置换锂护甲（钾会优先与水反应）。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'Fe':    { whyFailed: '钾不能置换铁护甲', chemPrinciple: '钾遇水先爆炸，不能在溶液中稳定置换铁。', hint: '试试用 HCl（盐酸）破除铁护甲！' },
      'Cu':    { whyFailed: '钾不能置换铜护甲', chemPrinciple: '钾遇水先爆炸，不能在硫酸铜溶液中稳定置换铜。', hint: '试试用 Fe（铁）破除铜护甲！' },
      'NaOH':  { whyFailed: '钾不能中和强碱护甲', chemPrinciple: '钾是金属，不是酸，无法中和碱护甲。', hint: '试试用 HCl（盐酸）破除NaOH护甲！' },
      'HCl':   { whyFailed: '钾不能直接中和盐酸护甲', chemPrinciple: '钾遇盐酸会先与水反应，不是直接中和的正确路径。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: '钾不能溶解石灰石护甲', chemPrinciple: '碳酸钙需要酸才能溶解，钾是金属不是酸。', hint: '试试用 HCl（盐酸）破除石灰石护甲！' },
      'Fe2O3': { whyFailed: '钾不能还原铁锈护甲', chemPrinciple: '铁锈需要还原剂（C/H₂）高温还原，或酸溶解。', hint: '试试用 C（碳）或 HCl 破除铁锈护甲！' },
      'CO2':   { whyFailed: '钾不能直接吸收CO₂护甲', chemPrinciple: 'CO₂需要碱性物质（NaOH）来吸收，钾是金属。', hint: '试试用 NaOH 破除CO₂护甲！' },
      'Al':    { whyFailed: '钾不能置换铝护甲', chemPrinciple: '铝需要酸或强碱溶解，钾不能直接置换铝。', hint: '试试用 HCl 或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 氢气牌
    'H2': {
      'Na':    { whyFailed: 'H₂不能破除钠护甲', chemPrinciple: '氢气不与钠发生置换反应。破除碱金属护甲需要水（H₂O），不是氢气（H₂）。', hint: '试试用 H₂O（水）破除钠护甲！2Na + 2H₂O → 2NaOH + H₂↑' },
      'K':     { whyFailed: 'H₂不能破除钾护甲', chemPrinciple: '氢气不与钾反应。破除碱金属护甲需要水（H₂O）。', hint: '试试用 H₂O（水）破除钾护甲！' },
      'Li':    { whyFailed: 'H₂不能破除锂护甲', chemPrinciple: '氢气不与锂发生置换反应。需要用水（H₂O）破除锂护甲。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'Cu':    { whyFailed: 'H₂不能破除铜护甲', chemPrinciple: '铜的活动性弱，H₂不能置换铜护甲。铜需要被活动性更强的金属（如Fe）置换。', hint: '试试用 Fe（铁）破除铜护甲！Fe + CuSO₄ → FeSO₄ + Cu' },
      'Fe':    { whyFailed: 'H₂不能直接破除铁护甲', chemPrinciple: 'H₂不能置换铁护甲（铁在活动性表H前，但H₂不与铁护甲直接反应）。H₂只能高温还原铁锈（Fe₂O₃）。', hint: '试试用 HCl（盐酸）破除铁护甲！Fe + 2HCl → FeCl₂ + H₂↑' },
      'NaOH':  { whyFailed: 'H₂不能中和强碱护甲', chemPrinciple: '氢气不是酸，不能与碱发生中和反应。', hint: '试试用 HCl（盐酸）破除NaOH护甲！NaOH + HCl → NaCl + H₂O' },
      'HCl':   { whyFailed: 'H₂不能中和盐酸护甲', chemPrinciple: '氢气不是碱，不能中和盐酸。H₂与HCl不发生反应（常温常压下）。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: 'H₂不能溶解石灰石护甲', chemPrinciple: '碳酸钙需要酸才能溶解，氢气不是酸。', hint: '试试用 HCl（盐酸）破除石灰石护甲！CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑' },
      'CO2':   { whyFailed: 'H₂不能吸收CO₂护甲', chemPrinciple: 'CO₂需要碱性物质（NaOH）吸收，氢气不是碱。', hint: '试试用 NaOH 破除CO₂护甲！2NaOH + CO₂ → Na₂CO₃ + H₂O' },
      'Cl':    { whyFailed: 'H₂不能破除氯气护甲', chemPrinciple: 'H₂与Cl₂反应需要点燃或光照（H₂ + Cl₂ → 2HCl），但这是H₂被氯气氧化，不能破除氯气护甲。氯气护甲需要活泼金属（Na/K/Fe）点燃破除。', hint: '试试用 Na（钠）或 Fe（铁）破除氯气护甲！' },
      'Al':    { whyFailed: 'H₂不能破除铝护甲', chemPrinciple: '铝护甲需要酸（HCl/H₂SO₄）或强碱（NaOH）溶解，氢气不能与铝反应。', hint: '试试用 HCl（盐酸）破除铝护甲！2Al + 6HCl → 2AlCl₃ + 3H₂↑' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 氧气牌
    'O2': {
      'O2':    { whyFailed: 'O₂不能破除自身护甲', chemPrinciple: '同种物质之间不发生化学反应。氧气护甲需要可燃物（H₂、C）点燃才能被破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！2H₂ + O₂ →(点燃) 2H₂O' },
      'Cu':    { whyFailed: 'O₂不能破除铜护甲（常温下）', chemPrinciple: '铜在常温下不与氧气反应，需要加热才能生成CuO（2Cu + O₂ →(加热) 2CuO）。游戏中铜护甲需要置换反应（Fe + CuSO₄）破除。', hint: '试试用 Fe（铁）破除铜护甲！Fe + CuSO₄ → FeSO₄ + Cu' },
      'NaOH':  { whyFailed: 'O₂不能与NaOH护甲反应', chemPrinciple: '氧气不与强碱发生反应，NaOH护甲需要酸中和。', hint: '试试用 HCl（盐酸）破除NaOH护甲！NaOH + HCl → NaCl + H₂O' },
      'HCl':   { whyFailed: 'O₂不能中和盐酸护甲', chemPrinciple: '氧气不与盐酸反应，盐酸护甲需要碱中和。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: 'O₂不能溶解石灰石护甲', chemPrinciple: '碳酸钙不与氧气反应，需要酸才能溶解。', hint: '试试用 HCl（盐酸）破除石灰石护甲！' },
      'Fe2O3': { whyFailed: 'O₂不能还原铁锈护甲（方向相反）', chemPrinciple: '铁锈（Fe₂O₃）本身就是铁被氧化的产物，再加氧气只会使氧化更严重，不能还原。需要还原剂（C/H₂）高温还原。', hint: '试试用 C（碳）或 H₂（氢气）高温还原铁锈护甲！' },
      'CO2':   { whyFailed: 'O₂不能吸收CO₂护甲', chemPrinciple: 'CO₂需要碱（NaOH）吸收，氧气不与CO₂反应。', hint: '试试用 NaOH 破除CO₂护甲！' },
      'Cl':    { whyFailed: 'O₂不能破除氯气护甲', chemPrinciple: '氧气与氯气不发生反应（两者都是强氧化剂），氯气护甲需要活泼金属点燃破除。', hint: '试试用 Na（钠）或 Fe（铁）破除氯气护甲！' },
      'Al':    { whyFailed: 'O₂不能破除铝护甲', chemPrinciple: '铝表面有致密氧化膜（Al₂O₃），常温下氧气无法进一步氧化铝护甲。铝护甲需要酸或强碱溶解。', hint: '试试用 HCl（盐酸）或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 碳牌
    'C': {
      'Na':    { whyFailed: '碳不能破除钠护甲', chemPrinciple: '碳不与钠发生置换反应，钠护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除钠护甲！' },
      'K':     { whyFailed: '碳不能破除钾护甲', chemPrinciple: '碳不与钾反应，钾护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除钾护甲！' },
      'Li':    { whyFailed: '碳不能破除锂护甲', chemPrinciple: '碳不与锂反应，锂护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'Cu':    { whyFailed: '碳不能破除铜护甲', chemPrinciple: '碳虽然是还原剂，但不能在常温下还原铜护甲。铜护甲需要置换反应（Fe + CuSO₄）破除。', hint: '试试用 Fe（铁）破除铜护甲！' },
      'Fe':    { whyFailed: '碳不能直接破除铁护甲', chemPrinciple: '碳不与铁护甲直接反应。铁护甲需要酸（HCl/H₂SO₄）溶解，或活动性更强的金属（Zn）置换。', hint: '试试用 HCl（盐酸）破除铁护甲！Fe + 2HCl → FeCl₂ + H₂↑' },
      'NaOH':  { whyFailed: '碳不能中和强碱护甲', chemPrinciple: '碳不与NaOH发生中和反应，NaOH护甲需要酸中和。', hint: '试试用 HCl（盐酸）破除NaOH护甲！' },
      'HCl':   { whyFailed: '碳不能中和盐酸护甲', chemPrinciple: '碳不与盐酸发生中和反应（碳是非金属，不是碱）。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: '碳不能溶解石灰石护甲', chemPrinciple: '碳不与碳酸钙反应，石灰石需要酸溶解。', hint: '试试用 HCl（盐酸）破除石灰石护甲！' },
      'Cl':    { whyFailed: '碳不能破除氯气护甲', chemPrinciple: '碳与氯气不发生反应（常温下），氯气护甲需要活泼金属（Na/K/Fe）点燃破除。', hint: '试试用 Na（钠）或 Fe（铁）破除氯气护甲！' },
      'Al':    { whyFailed: '碳不能破除铝护甲', chemPrinciple: '碳不与铝护甲反应，铝护甲需要酸或强碱溶解。', hint: '试试用 HCl（盐酸）或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 盐酸牌
    'HCl': {
      'O2':    { whyFailed: 'HCl不能破除氧气护甲', chemPrinciple: '盐酸（HCl）不与氧气发生反应，氧气护甲需要可燃物（H₂/C）点燃破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！' },
      'Na':    { whyFailed: 'HCl不能破除钠护甲（游戏规则）', chemPrinciple: '虽然Na与HCl会剧烈反应，但游戏中钠护甲专门被水（H₂O）破除，体现"钠遇水反应"的核心知识点。', hint: '试试用 H₂O（水）破除钠护甲！2Na + 2H₂O → 2NaOH + H₂↑' },
      'K':     { whyFailed: 'HCl不能破除钾护甲（游戏规则）', chemPrinciple: '游戏中钾护甲专门被水（H₂O）破除，体现"活泼碱金属遇水反应"的核心知识点。', hint: '试试用 H₂O（水）破除钾护甲！' },
      'Li':    { whyFailed: 'HCl不能破除锂护甲（游戏规则）', chemPrinciple: '游戏中锂护甲专门被水（H₂O）破除，体现碱金属与水反应的规律。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'Cu':    { whyFailed: 'HCl不能溶解铜护甲', chemPrinciple: '铜（Cu）在金属活动性顺序表中位于氢（H）之后，稀盐酸不能与铜反应。只有活动性在H前的金属才能与稀酸反应。', hint: '试试用 Fe（铁）破除铜护甲！Fe + CuSO₄ → FeSO₄ + Cu' },
      'CO2':   { whyFailed: 'HCl不能吸收CO₂护甲', chemPrinciple: 'CO₂是酸性氧化物，HCl也是酸，酸不能吸收酸性气体。CO₂护甲需要碱（NaOH）吸收。', hint: '试试用 NaOH（氢氧化钠）破除CO₂护甲！2NaOH + CO₂ → Na₂CO₃ + H₂O' },
      'Cl':    { whyFailed: 'HCl不能破除氯气护甲', chemPrinciple: 'HCl是氯化氢，不能与Cl₂护甲发生反应破除它。氯气护甲需要活泼金属点燃破除。', hint: '试试用 Na（钠）或 Fe（铁）破除氯气护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // NaOH牌
    'NaOH': {
      'O2':    { whyFailed: 'NaOH不能破除氧气护甲', chemPrinciple: 'NaOH（强碱）不与氧气反应，氧气护甲需要可燃物点燃破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！' },
      'Na':    { whyFailed: 'NaOH不能破除钠护甲', chemPrinciple: 'NaOH不与钠金属发生置换反应，钠护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除钠护甲！' },
      'K':     { whyFailed: 'NaOH不能破除钾护甲', chemPrinciple: 'NaOH不与钾金属反应，钾护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除钾护甲！' },
      'Li':    { whyFailed: 'NaOH不能破除锂护甲', chemPrinciple: 'NaOH不与锂金属反应，锂护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'Fe':    { whyFailed: 'NaOH不能溶解铁护甲', chemPrinciple: 'NaOH（强碱）不与铁反应（铁不是两性金属）。铁护甲需要酸（HCl/H₂SO₄）溶解。', hint: '试试用 HCl（盐酸）破除铁护甲！Fe + 2HCl → FeCl₂ + H₂↑' },
      'Cu':    { whyFailed: 'NaOH不能溶解铜护甲', chemPrinciple: 'NaOH不与铜反应，铜护甲需要置换反应（Fe + CuSO₄）破除。', hint: '试试用 Fe（铁）破除铜护甲！' },
      'CaCO3': { whyFailed: 'NaOH不能溶解石灰石护甲', chemPrinciple: 'NaOH（碱）不与碳酸钙（碳酸盐）发生溶解反应，石灰石需要酸溶解。', hint: '试试用 HCl（盐酸）破除石灰石护甲！CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑' },
      'Fe2O3': { whyFailed: 'NaOH不能还原铁锈护甲', chemPrinciple: 'NaOH不与Fe₂O₃反应（Fe₂O₃是碱性氧化物，不与碱反应）。铁锈需要酸溶解或还原剂高温还原。', hint: '试试用 HCl（盐酸）或 C（碳）破除铁锈护甲！' },
      'Cl':    { whyFailed: 'NaOH不能破除氯气护甲', chemPrinciple: '虽然NaOH可以吸收Cl₂（Cl₂ + 2NaOH → NaCl + NaClO + H₂O），但游戏中氯气护甲专门被活泼金属点燃破除，体现卤素的强氧化性。', hint: '试试用 Na（钠）或 Fe（铁）点燃破除氯气护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 水牌
    'H2O': {
      'O2':    { whyFailed: 'H₂O不能破除氧气护甲', chemPrinciple: '水不与氧气反应，氧气护甲需要可燃物（H₂/C）点燃破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！' },
      'Fe':    { whyFailed: 'H₂O不能破除铁护甲', chemPrinciple: '铁在常温常压下不与水反应（铁在高温水蒸气下才反应：3Fe + 4H₂O →(高温) Fe₃O₄ + 4H₂↑，游戏中不适用）。铁护甲需要酸溶解。', hint: '试试用 HCl（盐酸）破除铁护甲！' },
      'Cu':    { whyFailed: 'H₂O不能破除铜护甲', chemPrinciple: '铜不与水反应，铜护甲需要置换反应（Fe + CuSO₄）破除。', hint: '试试用 Fe（铁）破除铜护甲！' },
      'NaOH':  { whyFailed: 'H₂O不能中和NaOH护甲', chemPrinciple: '水不与NaOH发生中和反应（水是中性物质），NaOH护甲需要酸中和。', hint: '试试用 HCl（盐酸）破除NaOH护甲！' },
      'HCl':   { whyFailed: 'H₂O不能中和盐酸护甲', chemPrinciple: '水不与HCl发生中和反应，盐酸护甲需要碱（NaOH）中和。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: 'H₂O不能溶解石灰石护甲', chemPrinciple: '碳酸钙几乎不溶于水（微溶），需要酸才能溶解。', hint: '试试用 HCl（盐酸）破除石灰石护甲！' },
      'Fe2O3': { whyFailed: 'H₂O不能还原铁锈护甲', chemPrinciple: '铁锈（Fe₂O₃）不溶于水，需要酸溶解或还原剂高温还原。', hint: '试试用 HCl（盐酸）或 C（碳）破除铁锈护甲！' },
      'CO2':   { whyFailed: 'H₂O不能吸收CO₂护甲', chemPrinciple: '水与CO₂反应生成碳酸（H₂O + CO₂ → H₂CO₃），但碳酸是弱酸，不能有效破除CO₂护甲。需要强碱（NaOH）才能彻底吸收。', hint: '试试用 NaOH（氢氧化钠）破除CO₂护甲！2NaOH + CO₂ → Na₂CO₃ + H₂O' },
      'Cl':    { whyFailed: 'H₂O不能破除氯气护甲', chemPrinciple: '水与Cl₂反应生成盐酸和次氯酸（Cl₂ + H₂O → HCl + HClO），但这不能破除氯气护甲。氯气护甲需要活泼金属点燃破除。', hint: '试试用 Na（钠）或 Fe（铁）破除氯气护甲！' },
      'Al':    { whyFailed: 'H₂O不能破除铝护甲', chemPrinciple: '铝表面有致密氧化膜，常温下不与水反应。铝护甲需要酸（HCl）或强碱（NaOH）溶解。', hint: '试试用 HCl（盐酸）或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 铁牌
    'Fe': {
      'O2':    { whyFailed: '铁不能破除氧气护甲', chemPrinciple: '铁在氧气中燃烧（3Fe + 2O₂ → Fe₃O₄）是铁被氧化，不是铁破除氧气护甲。游戏中O₂护甲需要可燃物（H₂/C）点燃破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！' },
      'Na':    { whyFailed: '铁不能破除钠护甲', chemPrinciple: '铁的活动性弱于钠，不能置换钠护甲。钠护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除钠护甲！' },
      'K':     { whyFailed: '铁不能破除钾护甲', chemPrinciple: '铁的活动性弱于钾，不能置换钾护甲。钾护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除钾护甲！' },
      'Li':    { whyFailed: '铁不能破除锂护甲', chemPrinciple: '铁的活动性弱于锂，不能置换锂护甲。锂护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'Fe':    { whyFailed: '铁不能置换自身护甲', chemPrinciple: '同种物质不发生置换反应。铁护甲需要酸（HCl/H₂SO₄）溶解，或活动性更强的金属（Zn）置换。', hint: '试试用 HCl（盐酸）或 Zn（锌）破除铁护甲！' },
      'NaOH':  { whyFailed: '铁不能中和NaOH护甲', chemPrinciple: '铁是金属，不是酸，不能与碱发生中和反应。', hint: '试试用 HCl（盐酸）破除NaOH护甲！' },
      'HCl':   { whyFailed: '铁不能中和盐酸护甲', chemPrinciple: '铁是金属，不是碱，不能中和盐酸护甲。（铁与盐酸反应生成FeCl₂，但这是铁被溶解，不是破甲。）', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: '铁不能溶解石灰石护甲', chemPrinciple: '铁不与碳酸钙反应，石灰石需要酸溶解。', hint: '试试用 HCl（盐酸）破除石灰石护甲！' },
      'Fe2O3': { whyFailed: '铁不能还原铁锈护甲', chemPrinciple: '铁不能还原自身的氧化物（Fe₂O₃），铁锈需要还原剂（C/H₂）高温还原，或酸溶解。', hint: '试试用 C（碳）或 HCl 破除铁锈护甲！' },
      'CO2':   { whyFailed: '铁不能吸收CO₂护甲', chemPrinciple: '铁不与CO₂反应，CO₂护甲需要碱（NaOH）吸收。', hint: '试试用 NaOH 破除CO₂护甲！' },
      'Cl':    { whyFailed: '铁不能直接破除氯气护甲（需要点燃）', chemPrinciple: '铁与氯气反应需要点燃条件（2Fe + 3Cl₂ →(点燃) 2FeCl₃）。游戏中铁牌不具备点燃条件，氯气护甲需要专门的点燃类牌破除。', hint: '试试用 Cl₂（氯气牌）点燃破除金属护甲，或用 Na 破除氯气护甲！' },
      'Al':    { whyFailed: '铁不能破除铝护甲', chemPrinciple: '铁的活动性弱于铝（Al > Fe），铁不能置换铝护甲。铝护甲需要酸或强碱溶解。', hint: '试试用 HCl（盐酸）或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 氯气牌
    'Cl2': {
      'O2':    { whyFailed: 'Cl₂不能破除氧气护甲', chemPrinciple: '氯气与氧气不发生反应（两者都是强氧化剂），氧气护甲需要可燃物点燃破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！' },
      'Cl':    { whyFailed: 'Cl₂不能破除自身护甲', chemPrinciple: '同种物质不发生化学反应。', hint: '试试用 Na（钠）或 Fe（铁）点燃破除氯气护甲！' },
      'NaOH':  { whyFailed: 'Cl₂不能破除NaOH护甲（游戏规则）', chemPrinciple: '虽然Cl₂与NaOH反应（Cl₂ + 2NaOH → NaCl + NaClO + H₂O），但游戏中NaOH护甲专门被酸（HCl）中和破除，体现酸碱中和知识点。', hint: '试试用 HCl（盐酸）破除NaOH护甲！' },
      'HCl':   { whyFailed: 'Cl₂不能破除盐酸护甲', chemPrinciple: 'Cl₂与HCl不发生反应，盐酸护甲需要碱（NaOH）中和。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: 'Cl₂不能溶解石灰石护甲', chemPrinciple: 'Cl₂不与碳酸钙反应，石灰石需要酸溶解。', hint: '试试用 HCl（盐酸）破除石灰石护甲！' },
      'Fe2O3': { whyFailed: 'Cl₂不能还原铁锈护甲', chemPrinciple: 'Cl₂是氧化剂，不是还原剂，不能还原铁锈。铁锈需要还原剂（C/H₂）高温还原。', hint: '试试用 C（碳）或 H₂ 破除铁锈护甲！' },
      'CO2':   { whyFailed: 'Cl₂不能吸收CO₂护甲', chemPrinciple: 'Cl₂不与CO₂反应，CO₂护甲需要碱（NaOH）吸收。', hint: '试试用 NaOH 破除CO₂护甲！' },
      'Al':    { whyFailed: 'Cl₂不能破除铝护甲（游戏规则）', chemPrinciple: '虽然Cl₂与Al反应（2Al + 3Cl₂ → 2AlCl₃），但游戏中铝护甲专门被酸/碱破除，体现铝的两性。', hint: '试试用 HCl（盐酸）或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 稀硫酸牌
    'H2SO4': {
      'O2':    { whyFailed: 'H₂SO₄不能破除氧气护甲', chemPrinciple: '稀硫酸不与氧气反应，氧气护甲需要可燃物点燃破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！' },
      'Na':    { whyFailed: 'H₂SO₄不能破除钠护甲（游戏规则）', chemPrinciple: '游戏中钠护甲专门被水（H₂O）破除，体现碱金属遇水反应的核心知识点。', hint: '试试用 H₂O（水）破除钠护甲！' },
      'K':     { whyFailed: 'H₂SO₄不能破除钾护甲（游戏规则）', chemPrinciple: '游戏中钾护甲专门被水（H₂O）破除，体现碱金属遇水反应。', hint: '试试用 H₂O（水）破除钾护甲！' },
      'Li':    { whyFailed: 'H₂SO₄不能破除锂护甲（游戏规则）', chemPrinciple: '游戏中锂护甲专门被水（H₂O）破除，体现碱金属遇水反应。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'Cu':    { whyFailed: '稀H₂SO₄不能溶解铜护甲', chemPrinciple: '铜（Cu）在金属活动性顺序表中位于氢（H）之后，稀硫酸不能与铜反应（注意：浓硫酸可以，但游戏中用的是稀硫酸）。', hint: '试试用 Fe（铁）破除铜护甲！Fe + CuSO₄ → FeSO₄ + Cu' },
      'CO2':   { whyFailed: 'H₂SO₄不能吸收CO₂护甲', chemPrinciple: 'H₂SO₄是酸，CO₂也是酸性物质，酸不能吸收酸性气体。CO₂护甲需要碱（NaOH）吸收。', hint: '试试用 NaOH（氢氧化钠）破除CO₂护甲！' },
      'Cl':    { whyFailed: 'H₂SO₄不能破除氯气护甲', chemPrinciple: 'H₂SO₄不与Cl₂护甲发生破甲反应，氯气护甲需要活泼金属点燃破除。', hint: '试试用 Na（钠）或 Fe（铁）破除氯气护甲！' },
      'HCl':   { whyFailed: 'H₂SO₄不能中和盐酸护甲', chemPrinciple: 'H₂SO₄和HCl都是酸，酸不能中和酸。盐酸护甲需要碱（NaOH）中和。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 硫酸铜牌
    'CuSO4': {
      'O2':    { whyFailed: 'CuSO₄不能破除氧气护甲', chemPrinciple: '硫酸铜溶液不与氧气反应，氧气护甲需要可燃物点燃破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！' },
      'Na':    { whyFailed: 'CuSO₄不能破除钠护甲', chemPrinciple: '钠护甲需要水（H₂O）破除，硫酸铜溶液不能破除碱金属护甲。', hint: '试试用 H₂O（水）破除钠护甲！' },
      'K':     { whyFailed: 'CuSO₄不能破除钾护甲', chemPrinciple: '钾护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除钾护甲！' },
      'Li':    { whyFailed: 'CuSO₄不能破除锂护甲', chemPrinciple: '锂护甲需要水（H₂O）破除。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'Cu':    { whyFailed: 'CuSO₄不能破除铜护甲', chemPrinciple: '铜不能置换自身（Cu + CuSO₄不反应），同种物质不发生置换反应。', hint: '试试用 Fe（铁）破除铜护甲！Fe + CuSO₄ → FeSO₄ + Cu' },
      'NaOH':  { whyFailed: 'CuSO₄不能中和NaOH护甲', chemPrinciple: 'CuSO₄是盐，不是酸，不能中和碱护甲。（CuSO₄与NaOH反应生成Cu(OH)₂沉淀，但这不是破甲机制。）', hint: '试试用 HCl（盐酸）破除NaOH护甲！' },
      'HCl':   { whyFailed: 'CuSO₄不能中和盐酸护甲', chemPrinciple: 'CuSO₄是盐，不是碱，不能中和盐酸护甲。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: 'CuSO₄不能溶解石灰石护甲', chemPrinciple: 'CuSO₄不与碳酸钙发生溶解反应（会生成CaCO₃沉淀，但不能破甲）。石灰石需要酸溶解。', hint: '试试用 HCl（盐酸）破除石灰石护甲！' },
      'Fe2O3': { whyFailed: 'CuSO₄不能还原铁锈护甲', chemPrinciple: 'CuSO₄不能还原Fe₂O₃，铁锈需要还原剂（C/H₂）高温还原。', hint: '试试用 C（碳）或 H₂ 破除铁锈护甲！' },
      'CO2':   { whyFailed: 'CuSO₄不能吸收CO₂护甲', chemPrinciple: 'CuSO₄是盐，不是碱，不能吸收CO₂。CO₂护甲需要碱（NaOH）吸收。', hint: '试试用 NaOH 破除CO₂护甲！' },
      'Cl':    { whyFailed: 'CuSO₄不能破除氯气护甲', chemPrinciple: 'CuSO₄不与Cl₂护甲发生破甲反应，氯气护甲需要活泼金属点燃破除。', hint: '试试用 Na（钠）或 Fe（铁）破除氯气护甲！' },
      'Al':    { whyFailed: 'CuSO₄不能破除铝护甲', chemPrinciple: '铝护甲需要酸（HCl）或强碱（NaOH）溶解，CuSO₄不能破除铝护甲。', hint: '试试用 HCl（盐酸）或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
    // 锌牌
    'Zn': {
      'O2':    { whyFailed: 'Zn不能破除氧气护甲', chemPrinciple: '锌在氧气中燃烧（2Zn + O₂ → 2ZnO），但游戏中O₂护甲需要H₂/C点燃破除。', hint: '试试用 H₂（氢气）或 C（碳）破除氧气护甲！' },
      'Na':    { whyFailed: 'Zn不能破除钠护甲', chemPrinciple: '锌的活动性弱于钠，不能置换钠护甲。', hint: '试试用 H₂O（水）破除钠护甲！' },
      'K':     { whyFailed: 'Zn不能破除钾护甲', chemPrinciple: '锌的活动性弱于钾，不能置换钾护甲。', hint: '试试用 H₂O（水）破除钾护甲！' },
      'Li':    { whyFailed: 'Zn不能破除锂护甲', chemPrinciple: '锌的活动性弱于锂，不能置换锂护甲。', hint: '试试用 H₂O（水）破除锂护甲！' },
      'NaOH':  { whyFailed: 'Zn不能中和NaOH护甲', chemPrinciple: '锌是金属，不是酸，不能中和碱护甲。（注：锌与NaOH溶液反应生成H₂，但这是两性金属的特殊反应，游戏中NaOH护甲需要酸中和。）', hint: '试试用 HCl（盐酸）破除NaOH护甲！' },
      'HCl':   { whyFailed: 'Zn不能中和盐酸护甲', chemPrinciple: '锌是金属，不是碱，不能中和盐酸护甲。', hint: '试试用 NaOH（氢氧化钠）破除盐酸护甲！' },
      'CaCO3': { whyFailed: 'Zn不能溶解石灰石护甲', chemPrinciple: '锌不与碳酸钙反应，石灰石需要酸溶解。', hint: '试试用 HCl（盐酸）破除石灰石护甲！' },
      'Fe2O3': { whyFailed: 'Zn不能还原铁锈护甲', chemPrinciple: '锌不能直接还原铁锈（Fe₂O₃），需要还原剂（C/H₂）高温还原。', hint: '试试用 C（碳）或 H₂ 破除铁锈护甲！' },
      'CO2':   { whyFailed: 'Zn不能吸收CO₂护甲', chemPrinciple: 'CO₂需要碱（NaOH）吸收，锌是金属不是碱。', hint: '试试用 NaOH 破除CO₂护甲！' },
      'Cl':    { whyFailed: 'Zn不能直接破除氯气护甲', chemPrinciple: '锌与氯气反应需要点燃条件，游戏中氯气护甲需要Na/K/Fe等活泼金属点燃破除。', hint: '试试用 Na（钠）或 Fe（铁）破除氯气护甲！' },
      'Al':    { whyFailed: 'Zn不能破除铝护甲', chemPrinciple: '铝的活动性强于锌（Al > Zn），锌不能置换铝护甲。铝护甲需要酸或强碱溶解。', hint: '试试用 HCl（盐酸）或 NaOH 破除铝护甲！' },
      'Ar':    { whyFailed: '稀有气体护甲无法被任何物质破除', chemPrinciple: '氩气化学性质极不活泼，不与任何物质反应。', hint: '稀有气体护甲无法被直接破除！' },
    },
  };

  // 查找精确匹配
  const specificReason = specificReasons[cardId]?.[armorId];
  if (specificReason) {
    return { cardName, armorName, ...specificReason };
  }

  // ── 通用失败原因（基于护甲化学类型）──
  const armorChemType = armor?.chemType;
  let whyFailed = `${cardName} 无法与 ${armorName} 发生化学反应`;
  let chemPrinciple = '这两种物质在常温常压下不发生化学反应。';
  let hint = '查看左侧"可破甲的牌"标签，选择正确的元素！';

  if (armorChemType === 'noble') {
    whyFailed = `稀有气体护甲无法被 ${cardName} 破除`;
    chemPrinciple = '稀有气体（如Ar、He）外层电子已满，化学性质极不活泼，几乎不与任何物质发生化学反应。';
    hint = '稀有气体护甲无法被直接破除，只能等待或使用特殊技能牌！';
  } else if (armorChemType === 'acid') {
    whyFailed = `${cardName} 不能中和酸性护甲`;
    chemPrinciple = '酸性护甲（如HCl）需要碱性物质（NaOH）中和，酸碱中和反应：NaOH + HCl → NaCl + H₂O。';
    hint = '试试用 NaOH（氢氧化钠）破除酸性护甲！';
  } else if (armorChemType === 'base') {
    whyFailed = `${cardName} 不能中和碱性护甲`;
    chemPrinciple = '碱性护甲（如NaOH）需要酸性物质（HCl/H₂SO₄）中和，酸碱中和反应：NaOH + HCl → NaCl + H₂O。';
    hint = '试试用 HCl（盐酸）或 H₂SO₄（稀硫酸）破除碱性护甲！';
  } else if (armorChemType === 'metal') {
    whyFailed = `${cardName} 不能破除金属护甲`;
    chemPrinciple = '金属护甲需要活动性更强的金属（置换反应）或酸（溶解反应）才能破除。';
    hint = '查看左侧"可破甲的牌"标签，选择正确的元素！';
  }

  return { cardName, armorName, whyFailed, chemPrinciple, hint };
}

export interface DiscardCardResult {
  newState: BattleState;
}

export interface EnemyTurnResult {
  newState: BattleState;
  action: EnemyAction;
  actualDamage: number;
  shieldAbsorbed: number;
}

/**
 * 初始化战斗状态
 */
export function initBattle(level: Level): BattleState {
  // 构建初始牌库（按关卡定义的顺序）
  const drawPile = [...level.playerDeck];

  // 抽初始手牌
  const hand = drawPile.splice(0, level.initialHandSize);

  // 获取第一层护甲
  const firstArmor = level.armorSequence[0];

  return {
    drawPile,
    hand,
    discardPile: [],
    playerHP: level.playerHP,
    playerMaxHP: level.playerHP,
    enemyHP: level.enemyHP,
    enemyMaxHP: level.enemyHP,
    playerShield: 0,
    enemyShield: 0,
    playerDefenseDebuff: 0,
    currentArmorIndex: 0,
    armorBroken: false,
    armorHP: firstArmor?.hp ?? 1,
    currentRound: 1,
    maxRounds: level.maxRounds,
    phase: 'player',
    catalyzed: false,
    enemyStrengthened: 0,
    battleLog: [{
      round: 0,
      type: 'system',
      message: `战斗开始！当前护甲：${firstArmor?.label ?? '无护甲'}`,
    }],
    totalMistakes: 0,
    cardsPlayed: 0,
    playsThisTurn: 0,
    maxPlaysPerTurn: level.maxPlaysPerTurn ?? 2,
    postArmorBroken: false,
    // 章节Boss新机制状态初始化
    sodiumExplosionPending: false,
    armorRegenCounter: 0,
    armorRegenMax: level.bossTraits?.armorRegenMax ?? 0,
    activityLockActive: false,
    activityLockRounds: 0,
    redoxArmorState: level.bossTraits?.initialRedoxState ?? null,
    // 能量系统初始化
    energy: 3,
    maxEnergy: 3,
    // 环境系统初始化
    currentEnv: 'normal',
    envRoundsLeft: 0,
  };
}

/**
 * 获取当前护甲层
 */
export function getCurrentArmor(level: Level, state: BattleState): ArmorLayer | null {
  if (state.currentArmorIndex >= level.armorSequence.length) return null;
  return level.armorSequence[state.currentArmorIndex];
}

/**
 * 判断卡牌是否能破除当前护甲
 */
export function canBreakArmor(cardId: string, armorId: string): boolean {
  const card = CARD_MAP[cardId];
  if (!card) return false;

  // 特殊牌（催化剂、护盾、侦查、回收）不能直接破甲
  if (['catalyze', 'shield', 'reveal', 'recover'].includes(card.skill)) return false;

  // （已移除universal技能，保留注释）

  // 检查是否在破甲列表中
  return card.breaksArmor.includes(armorId);
}

/**
 * 出牌处理
 */
export function playCard(
  cardId: string,
  level: Level,
  state: BattleState,
  discardCardId?: string  // 从弃牌堆回收时指定的牌ID
): PlayCardResult {
  const card = CARD_MAP[cardId];
  if (!card) {
    return { newState: state, armorBroken: false, isSuccess: false };
  }

  let newState = { ...state };
  newState.battleLog = [...state.battleLog];
  // 只移除第一个匹配的牌（避免同类型牌被一起打出）
  const removeIdx = state.hand.indexOf(cardId);
  newState.hand = removeIdx >= 0
    ? [...state.hand.slice(0, removeIdx), ...state.hand.slice(removeIdx + 1)]
    : state.hand;
  newState.discardPile = [...state.discardPile, cardId];
  newState.cardsPlayed++;
  // 每次出牌消耗一次出牌次数（催化剂不消耗）
  if (card.skill !== 'catalyze') {
    newState.playsThisTurn++;
  }

  // ── 能量校验（工具牌免费，催化剂免费） ──
  const energyCost = card.energyCost ?? 1;
  if (card.skill !== 'catalyze' && card.skill !== 'setEnv' && energyCost > 0) {
    if (newState.energy < energyCost) {
      // 能量不足，将牌放回手牌
      newState.playsThisTurn--;
      newState.cardsPlayed--;
      newState.hand = [...newState.hand, cardId];
      newState.discardPile = newState.discardPile.filter(id => id !== cardId);
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'armor_fail',
        message: `⚡ 能量不足！${card.name}需要${energyCost}点能量，当前只有${newState.energy}点。请先结束回合恢复能量。`,
        cardId,
        isSuccess: false,
      });
      return { newState, armorBroken: false, isSuccess: false };
    }
    newState.energy -= energyCost;
  }

  // ── 环境校验（工具牌和催化剂跳过） ──
  const requiredEnv = card.requiredEnv;
  if (requiredEnv && requiredEnv !== 'normal' && card.skill !== 'setEnv' && card.skill !== 'catalyze') {
    if (newState.currentEnv !== requiredEnv) {
      const envNames: Record<string, string> = { heat: '加热∆', ignite: '点燃🔥', aqueous: '水溶液💧' };
      const toolNames: Record<string, string> = { heat: '酒精灯', ignite: '打火机', aqueous: '烧杯' };
      newState.playsThisTurn--;
      newState.cardsPlayed--;
      newState.energy += energyCost; // 能量退回
      newState.hand = [...newState.hand, cardId];
      newState.discardPile = newState.discardPile.filter(id => id !== cardId);
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'armor_fail',
        message: `🌡️ 环境不匹配！${card.name}需要「${envNames[requiredEnv] ?? requiredEnv}」环境，当前是「${envNames[newState.currentEnv] ?? '常温'}」。请先打出「${toolNames[requiredEnv] ?? ''}」工具牌。`,
        cardId,
        isSuccess: false,
      });
      return { newState, armorBroken: false, isSuccess: false };
    }
  }

  let armorBroken = false;
  let isSuccess = false;
  let equation: string | undefined;
  let skillActivated: SkillType | undefined;
  let skillMessage: string | undefined;
  let extraTurn = false;

  const currentArmor = getCurrentArmor(level, newState);

  // 处理特殊技能牌
  if (card.skill === 'shield') {
    // 护盾牌：免疫下一次攻击
    newState.playerShield = Math.max(newState.playerShield, 30);
    skillActivated = 'shield';
    skillMessage = `${card.name}激活！获得护盾，免疫下一次攻击`;
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'skill',
      message: skillMessage,
      cardId,
      isSuccess: true,
    });
    isSuccess = true;
  } else if (card.skill === 'catalyze') {
    // 催化剂：下一张牌不消耗回合
    newState.catalyzed = true;
    extraTurn = true;
    skillActivated = 'catalyze';
    skillMessage = `${card.name}激活！催化加速，下一张牌立即生效（额外行动）`;
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'skill',
      message: skillMessage,
      cardId,
      isSuccess: true,
    });
    isSuccess = true;
  } else if (card.skill === 'reveal') {
    // 侦查牌：揭示未来护甲（由UI处理显示）
    skillActivated = 'reveal';
    skillMessage = `${card.name}激活！揭示敌人接下来3回合的护甲类型`;
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'skill',
      message: skillMessage,
      cardId,
      isSuccess: true,
    });
    isSuccess = true;
  } else if (card.skill === 'recover') {
    // 回收牌：从弃牌堆取回一张牌
    if (discardCardId && newState.discardPile.includes(discardCardId)) {
      newState.discardPile = newState.discardPile.filter(id => id !== discardCardId);
      newState.hand = [...newState.hand, discardCardId];
      skillActivated = 'recover';
      skillMessage = `${card.name}激活！从弃牌堆取回了 ${CARD_MAP[discardCardId]?.name ?? discardCardId}`;
      isSuccess = true;
    } else {
      skillMessage = `${card.name}激活！但弃牌堆为空，无法回收`;
      isSuccess = false;
    }
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'skill',
      message: skillMessage ?? '',
      cardId,
      isSuccess,
    });
  } else if (card.skill === 'setEnv') {
    // ── 环境工具牌：设置战场环境 ──
    const targetEnv = card.envTarget ?? 'normal';
    newState.currentEnv = targetEnv as BattleState['currentEnv'];
    newState.envRoundsLeft = 3; // 持续3回合
    const envLabels: Record<string, string> = { heat: '加热∆', ignite: '点燃🔥', aqueous: '水溶液💧' };
    skillActivated = 'setEnv';
    skillMessage = `${card.name}激活！战场环境切换为「${envLabels[targetEnv] ?? targetEnv}」，持续3回合`;
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'skill',
      message: skillMessage,
      cardId,
      isSuccess: true,
    });
    isSuccess = true;
  } else if (currentArmor) {
    // 尝试破甲
    const traits = level.bossTraits;

    // 检查Boss免疫牌（出牌无效，不消耗出牌次数）
    if (traits?.immuneToCards?.includes(cardId)) {
      if ((card.skill as string) !== 'catalyze') {
        newState.playsThisTurn--;
      }
      newState.hand = [...newState.hand, cardId];
      newState.discardPile = newState.discardPile.filter(id => id !== cardId);
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'armor_fail',
        message: `🛡️ ${card.name} 对 ${level.enemyName} 完全免疫！这个Boss对该元素不敏感。（化学原理：${traits.traitDescription ?? ''}）`,
        cardId,
        isSuccess: false,
      });
      return {
        newState,
        armorBroken: false,
        isSuccess: false,
        equation: undefined,
        skillActivated: undefined,
        skillMessage: undefined,
        extraTurn: false,
        failureReason: {
          cardName: card.name,
          armorName: currentArmor.label ?? currentArmor.armorId,
          whyFailed: `${card.name}对${level.enemyName}完全免疫`,
          chemPrinciple: traits.traitDescription ?? '该Boss对此元素不敏感',
          hint: `试试使用其他元素牌！Boss弱点：${traits.weakToCards?.join('、') ?? '未知'}`,
        },
      };
    }

    // 检查破甲后出牌限制（只有允许的牌才能攻击核心）
    if (newState.postArmorBroken && traits?.postArmorBreakAllowed) {
      const isAllowed = traits.postArmorBreakAllowed.includes(cardId) ||
        ['shield', 'catalyze', 'reveal', 'recover'].includes(card.skill ?? '');
      if (!isAllowed) {
        if ((card.skill as string) !== 'catalyze') {
          newState.playsThisTurn--;
        }
        newState.hand = [...newState.hand, cardId];
        newState.discardPile = newState.discardPile.filter(id => id !== cardId);
        const rebound = 6;
        const actualRebound = Math.max(0, rebound - newState.playerShield);
        newState.playerShield = Math.max(0, newState.playerShield - rebound);
        newState.playerHP = Math.max(0, newState.playerHP - actualRebound);
        newState.battleLog.push({
          round: newState.currentRound,
          type: 'armor_fail',
          message: `⚠️ 破甲后限制！${card.name} 无法攻击 ${level.enemyName} 的核心，反弹${actualRebound}点伤害。${traits.postArmorBreakHint ?? ''}`,
          cardId,
          damage: actualRebound,
          isSuccess: false,
        });
        return {
          newState,
          armorBroken: false,
          isSuccess: false,
          equation: undefined,
          skillActivated: undefined,
          skillMessage: undefined,
          extraTurn: false,
          failureReason: {
            cardName: card.name,
            armorName: currentArmor.label ?? currentArmor.armorId,
            whyFailed: `破甲后，${card.name}无法攻击该Boss的核心`,
            chemPrinciple: traits.postArmorBreakHint ?? '破甲后需要使用特定的化学反应牌才能攻击核心',
            hint: `允许的牌：${traits.postArmorBreakAllowed.join('、')}`,
          },
        };
      }
    }

    // ── 关20：氧化还原护甲机制检查 ──
    if (traits?.redoxArmor && newState.redoxArmorState) {
      const isOxidized = newState.redoxArmorState === 'oxidized';
      const validBreakers = isOxidized
        ? (traits.oxidizedBreakers ?? [])
        : (traits.reducedBreakers ?? []);
      const isRedoxValid = validBreakers.includes(cardId) ||
        ['shield', 'catalyze', 'reveal', 'recover'].includes(card.skill ?? '');
      if (!isRedoxValid) {
        // 用错氧化还原属性的牌：Boss回血
        const penalty = traits.redoxWrongPenalty ?? 15;
        newState.enemyHP = Math.min(newState.enemyMaxHP, newState.enemyHP + penalty);
        newState.totalMistakes++;
        newState.battleLog.push({
          round: newState.currentRound,
          type: 'armor_fail',
          message: `⚡ 氧化还原错误！${card.name}属于${isOxidized ? '氧化剂' : '还原剂'}，无法破除${isOxidized ? '氧化' : '还原'}态护甲！元素之神回血${penalty}点！`,
          cardId,
          damage: -penalty,
          isSuccess: false,
        });
        return {
          newState,
          armorBroken: false,
          isSuccess: false,
          equation: undefined,
          skillActivated: undefined,
          skillMessage: undefined,
          extraTurn: false,
          failureReason: {
            cardName: card.name,
            armorName: currentArmor.label ?? currentArmor.armorId,
            whyFailed: `${card.name}是${isOxidized ? '氧化剂' : '还原剂'}，不能破除${isOxidized ? '氧化' : '还原'}态护甲`,
            chemPrinciple: traits.redoxHint ?? '氧化剂只能破还原态护甲，还原剂只能破氧化态护甲',
            hint: `正确的牌：${validBreakers.join('、')}`,
          },
        };
      }
    }

    // ── 关15：活动性锁定机制检查 ──
    if (traits?.activityLock && newState.activityLockActive) {
      const activityOrder = traits.activityOrder ?? ['K', 'Na', 'Ca', 'Mg', 'Al', 'Zn', 'Fe', 'Cu', 'Ag'];
      const armorMetalId = currentArmor.armorId;
      const armorIdx = activityOrder.indexOf(armorMetalId);
      const cardIdx = activityOrder.indexOf(cardId);
      // 只有金属牌才需要检查活动性（酸碱牌不受限制）
      const isMetalCard = cardIdx >= 0;
      const isMetalArmor = armorIdx >= 0;
      if (isMetalCard && isMetalArmor && cardIdx >= armorIdx) {
        // 活动性不够强，反弹
        const rebound = 10;
        const actualRebound = Math.max(0, rebound - newState.playerShield);
        newState.playerShield = Math.max(0, newState.playerShield - rebound);
        newState.playerHP = Math.max(0, newState.playerHP - actualRebound);
        newState.totalMistakes++;
        newState.battleLog.push({
          round: newState.currentRound,
          type: 'armor_fail',
          message: `⛔ 活动性锁定！${card.name}的活动性不强于${currentArmor.label}，置换反应失败，反弹${actualRebound}点伤害！`,
          cardId,
          damage: actualRebound,
          isSuccess: false,
        });
        return {
          newState,
          armorBroken: false,
          isSuccess: false,
          equation: undefined,
          skillActivated: undefined,
          skillMessage: undefined,
          extraTurn: false,
          failureReason: {
            cardName: card.name,
            armorName: currentArmor.label ?? currentArmor.armorId,
            whyFailed: `${card.name}的活动性不强于${armorMetalId}，置换反应不成立`,
            chemPrinciple: traits.activityLockHint ?? '活动性锁定状态下，只有活动性更强的金属才能破甲',
            hint: `需要活动性强于 ${armorMetalId} 的金属牌，即：${activityOrder.slice(0, armorIdx).join('、')}`,
          },
        };
      }
    }

    const canBreak = canBreakArmor(cardId, currentArmor.armorId);

    if (canBreak) {
      // 破甲成功！
      equation = card.reactionEquation;
      isSuccess = true;

      // （universal技能已移除）
      if (false) {
        const universalDmg = 5;
        newState.enemyHP = Math.max(0, newState.enemyHP - universalDmg);
        newState.battleLog.push({
          round: newState.currentRound,
          type: 'armor_break',
          message: `${card.name}（万能溶剂）对护甲造成弱效，核心受到${universalDmg}点伤害`,
          cardId,
          equation,
          damage: universalDmg,
          isSuccess: true,
        });
      } else {
        // 正常破甲
        newState.armorHP--;

        if (newState.armorHP <= 0) {
          // 护甲完全破除
          armorBroken = true;
          // 应用Boss伤害倍率（弱点+50%，特性倍率叠加）
          const multiplier = traits?.cardDamageMultipliers?.[cardId] ?? 1.0;
          const weakBonus = traits?.weakToCards?.includes(cardId) ? 1.5 : 1.0;
          const coreDmg = Math.round(card.coreDamage * multiplier * weakBonus);
          newState.enemyHP = Math.max(0, newState.enemyHP - coreDmg);
          // 破甲后激活出牌限制
          if (traits?.postArmorBreakAllowed) {
            newState.postArmorBroken = true;
          }

          // 腐蚀技能：额外削减敌人攻击
          if (card.skill === 'corrode') {
            newState.enemyStrengthened = Math.max(0, newState.enemyStrengthened - 5);
            skillActivated = 'corrode';
            skillMessage = `腐蚀效果：敌人下回合攻击力降低5点`;
          }

          // 爆炸技能：对所有护甲层造成额外伤害
          if (card.skill === 'explode') {
            const extraDmg = 5 * level.armorSequence.length;
            newState.enemyHP = Math.max(0, newState.enemyHP - extraDmg);
            skillActivated = 'explode';
            skillMessage = `爆炸效果：对所有护甲层造成额外${extraDmg}点伤害`;
          }

          // 中和技能：对酸性护甲双倍效果
          if (card.skill === 'neutralize' && ['HCl', 'H2SO4'].includes(currentArmor.armorId)) {
            const bonusDmg = coreDmg;
            newState.enemyHP = Math.max(0, newState.enemyHP - bonusDmg);
            skillActivated = 'neutralize';
            skillMessage = `中和反应：对酸性护甲造成双倍效果，额外${bonusDmg}点伤害`;
          }

          const weakStr = traits?.weakToCards?.includes(cardId) ? ' 【弱点命中！】' : '';
          const multStr = (traits?.cardDamageMultipliers?.[cardId] && traits.cardDamageMultipliers[cardId] !== 1.0)
            ? ` (×${traits.cardDamageMultipliers[cardId].toFixed(1)})` : '';
          newState.battleLog.push({
            round: newState.currentRound,
            type: 'armor_break',
            message: `🎉 破甲成功！${card.name} 破除了 ${currentArmor.label}，核心受到${coreDmg}点伤害${multStr}${weakStr}${skillMessage ? '，' + skillMessage : ''}`,
            cardId,
            equation,
            damage: coreDmg,
            isSuccess: true,
          });

          // ── 关5：钠爆机制 ──
          // 当用H₂O牌破除Na护甲时，触发钓爆，对玩家造成额外溅射伤害
          if (traits?.sodiumExplosion && cardId === 'H2O' && currentArmor.armorId === 'Na') {
            const explodeDmg = traits.sodiumExplosionDamage ?? 10;
            const actualExplodeDmg = Math.max(0, explodeDmg - newState.playerShield);
            newState.playerShield = Math.max(0, newState.playerShield - explodeDmg);
            newState.playerHP = Math.max(0, newState.playerHP - actualExplodeDmg);
            newState.sodiumExplosionPending = true;
            newState.battleLog.push({
              round: newState.currentRound,
              type: 'system',
              message: `💥 钠爆！钠遇水剧烈反应：2Na + 2H₂O → 2NaOH + H₂↑，溅射伤害${actualExplodeDmg}点！${traits.sodiumExplosionHint ?? ''}`,
              equation: '2Na + 2H₂O → 2NaOH + H₂↑',
              damage: actualExplodeDmg,
              isSuccess: false,
            });
          }

          // ── 关20：氧化还原护甲切换状态 ──
          if (traits?.redoxArmor && newState.redoxArmorState) {
            // 每次破甲后，护甲状态切换
            newState.redoxArmorState = newState.redoxArmorState === 'oxidized' ? 'reduced' : 'oxidized';
            newState.battleLog.push({
              round: newState.currentRound,
              type: 'system',
              message: `⚗️ 护甲状态切换！下一层护甲为「${newState.redoxArmorState === 'oxidized' ? '氧化态' : '还原态'}」，需要对应的${newState.redoxArmorState === 'oxidized' ? '还原剂' : '氧化剂'}才能破除！`,
              isSuccess: true,
            });
          }

          // 推进到下一层护甲
          newState = advanceArmor(level, newState);
        } else {
          newState.battleLog.push({
            round: newState.currentRound,
            type: 'armor_break',
            message: `护甲受损！${card.name} 对 ${currentArmor.label} 造成伤害，护甲剩余${newState.armorHP}点耐久`,
            cardId,
            equation,
            isSuccess: true,
          });
        }
      }
    } else {
      // 破甲失败：反弹伤害
      isSuccess = false;
      newState.totalMistakes++;
      const rebound = 8;
      const actualRebound = Math.max(0, rebound - newState.playerShield);
      newState.playerShield = Math.max(0, newState.playerShield - rebound);
      newState.playerHP = Math.max(0, newState.playerHP - actualRebound);

      // 生成教学提示
      const failureReason = getFailureReason(cardId, currentArmor.armorId);

      newState.battleLog.push({
        round: newState.currentRound,
        type: 'armor_fail',
        message: `❌ 无法反应！${card.name} 无法破除 ${currentArmor.label}，反弹${actualRebound}点伤害`,
        cardId,
        damage: actualRebound,
        isSuccess: false,
      });

      return {
        newState,
        armorBroken: false,
        isSuccess: false,
        equation: undefined,
        skillActivated: undefined,
        skillMessage: undefined,
        extraTurn: false,
        failureReason,
      };
    }
  } else {
    // 无护甲：直接攻击核心（应用Boss伤害倍率）
    const directTraits = level.bossTraits;
    const directMult = directTraits?.cardDamageMultipliers?.[cardId] ?? 1.0;
    const directWeak = directTraits?.weakToCards?.includes(cardId) ? 1.5 : 1.0;
    const coreDmg = Math.round((card.coreDamage || 10) * directMult * directWeak);
    newState.enemyHP = Math.max(0, newState.enemyHP - coreDmg);
    isSuccess = true;
    const directWeakStr = directTraits?.weakToCards?.includes(cardId) ? ' 【弱点命中！】' : '';
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'player_play',
      message: `${card.name} 直接攻击核心，造成${coreDmg}点伤害${directWeakStr}`,
      cardId,
      damage: coreDmg,
      isSuccess: true,
    });
  }

  // 检查胜利
  if (newState.enemyHP <= 0) {
    newState.phase = 'victory';
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'system',
      message: '🎉 胜利！敌人被击败！',
      isSuccess: true,
    });
  }

  // 检查失败（玩家HP为0）
  if (newState.playerHP <= 0) {
    newState.phase = 'defeat';
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'system',
      message: '💀 失败！玩家HP耗尽',
      isSuccess: false,
    });
  }

  return {
    newState,
    armorBroken,
    isSuccess,
    equation,
    skillActivated,
    skillMessage,
    extraTurn: newState.catalyzed && card.skill === 'catalyze',
  };
}

/**
 * 弃牌处理
 */
export function discardCard(cardId: string, state: BattleState): DiscardCardResult {
  // 只移除第一个匹配的牌（避免同类型牌被一起弃置）
  const removeIdx = state.hand.indexOf(cardId);
  const newHand = removeIdx >= 0
    ? [...state.hand.slice(0, removeIdx), ...state.hand.slice(removeIdx + 1)]
    : state.hand;
  const newState = {
    ...state,
    hand: newHand,
    discardPile: [...state.discardPile, cardId],
    playsThisTurn: state.playsThisTurn + 1, // 弃牌也消耗出牌次数
    battleLog: [...state.battleLog, {
      round: state.currentRound,
      type: 'player_discard' as const,
      message: `弃置了 ${CARD_MAP[cardId]?.name ?? cardId}`,
      cardId,
    }],
  };
  return { newState };
}

/**
 * 推进到下一层护甲
 */
function advanceArmor(level: Level, state: BattleState): BattleState {
  const nextIndex = state.currentArmorIndex + 1;
  if (nextIndex >= level.armorSequence.length) {
    // 所有护甲已破，核心裸露
    return {
      ...state,
      currentArmorIndex: nextIndex,
      armorBroken: false,
      armorHP: 0,
    };
  }

  const nextArmor = level.armorSequence[nextIndex];
  return {
    ...state,
    currentArmorIndex: nextIndex,
    armorBroken: false,
    armorHP: nextArmor.hp,
    battleLog: [...state.battleLog, {
      round: state.currentRound,
      type: 'system',
      message: `下一层护甲出现：${nextArmor.label}`,
    }],
  };
}

/**
 * 敌人回合处理
 */
export function executeEnemyTurn(level: Level, state: BattleState): EnemyTurnResult {
  const actionIndex = (state.currentRound - 1) % level.enemyActions.length;
  const action = level.enemyActions[actionIndex];

  let newState = { ...state };
  newState.battleLog = [...state.battleLog];
  let actualDamage = 0;
  let shieldAbsorbed = 0;

  switch (action.type) {
    case 'attack': {
      const rawDamage = action.value + newState.enemyStrengthened;
      newState.enemyStrengthened = 0; // 蓄力消耗

      // 防御削减效果
      const finalDamage = Math.max(0, rawDamage - newState.playerDefenseDebuff);
      newState.playerDefenseDebuff = Math.max(0, newState.playerDefenseDebuff - 3); // 防御削减逐渐恢复

      // 护盾吸收
      if (newState.playerShield > 0) {
        shieldAbsorbed = Math.min(newState.playerShield, finalDamage);
        actualDamage = finalDamage - shieldAbsorbed;
        newState.playerShield = Math.max(0, newState.playerShield - finalDamage);
        newState.battleLog.push({
          round: newState.currentRound,
          type: 'enemy_action',
          message: `敌人使用 ${action.label}！护盾吸收${shieldAbsorbed}点，实际受到${actualDamage}点伤害`,
          damage: actualDamage,
        });
      } else {
        actualDamage = finalDamage;
        newState.battleLog.push({
          round: newState.currentRound,
          type: 'enemy_action',
          message: `敌人使用 ${action.label}！受到${actualDamage}点伤害`,
          damage: actualDamage,
        });
      }

      newState.playerHP = Math.max(0, newState.playerHP - actualDamage);
      break;
    }

    case 'shield': {
      // 敌人获得护盾
      const shieldValue = action.value ?? 20;
      newState.enemyShield = (newState.enemyShield ?? 0) + shieldValue;
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'enemy_action',
        message: `敌人使用 ${action.label}！敌人获得${shieldValue}点护盾`,
      });
      break;
    }

    case 'strengthen': {
      newState.enemyStrengthened += action.value;
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'enemy_action',
        message: `敌人使用 ${action.label}！下回合攻击额外增加${action.value}点`,
      });
      break;
    }

    case 'corrode': {
      newState.playerDefenseDebuff += action.value;
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'enemy_action',
        message: `敌人使用 ${action.label}！你的防御降低${action.value}点`,
        damage: action.value,
      });
      break;
    }

    case 'heal': {
      newState.enemyHP = Math.min(newState.enemyMaxHP, newState.enemyHP + action.value);
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'enemy_action',
        message: `敌人使用 ${action.label}！恢复${action.value}点HP`,
      });
      break;
    }
  }

  // ── 关10：护甲再生机制回合计数 ──
  const regenTraits = level.bossTraits;
  if (regenTraits?.armorRegen) {
    newState.armorRegenCounter++;
    const regenInterval = regenTraits.armorRegenInterval ?? 3;
    if (newState.armorRegenCounter >= regenInterval && newState.armorRegenMax > 0 && newState.currentArmorIndex > 0) {
      // 再生一层护甲（回退护甲索引）
      newState.currentArmorIndex = Math.max(0, newState.currentArmorIndex - 1);
      const regenArmor = level.armorSequence[newState.currentArmorIndex];
      newState.armorBroken = false;
      newState.armorHP = regenArmor?.hp ?? 1;
      newState.armorRegenCounter = 0;
      newState.armorRegenMax--;
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'system',
        message: `🔄 护甲再生！${regenTraits.armorRegenHint ?? '石灰石循环修复了一层护甲！'}（当前护甲：${regenArmor?.label ?? '未知'}`,
        isSuccess: false,
      });
    }
  }

  // ── 关15：活动性锁定机制回合计数 ──
  const lockTraits = level.bossTraits;
  if (lockTraits?.activityLock) {
    if (newState.activityLockActive) {
      newState.activityLockRounds--;
      if (newState.activityLockRounds <= 0) {
        newState.activityLockActive = false;
        newState.battleLog.push({
          round: newState.currentRound,
          type: 'system',
          message: '✅ 活动性锁定解除！现在可以正常出牌了。',
          isSuccess: true,
        });
      }
    } else {
      // 每隔N回合激活一次
      const lockInterval = lockTraits.activityLockInterval ?? 3;
      if (newState.currentRound % lockInterval === 0) {
        newState.activityLockActive = true;
        newState.activityLockRounds = lockTraits.activityLockDuration ?? 2;
        newState.battleLog.push({
          round: newState.currentRound,
          type: 'system',
          message: `⛔ 活动性锁定激活！${lockTraits.activityLockHint ?? '置换反应需要活动性更强的金属！'}（持续${newState.activityLockRounds}回合）`,
          isSuccess: false,
        });
      }
    }
  }

  // 检查玩家失败
  if (newState.playerHP <= 0) {
    newState.phase = 'defeat';
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'system',
      message: '💀 失败！玩家HP耗尽',
      isSuccess: false,
    });
  }

  return { newState, action, actualDamage, shieldAbsorbed };
}

/**
 * 结束玩家回合，进入下一回合
 */
export function endPlayerTurn(level: Level, state: BattleState): BattleState {
  let newState = { ...state };

  // 重置本回合出牌次数
  newState.playsThisTurn = 0;
  newState.postArmorBroken = false; // 每回合开始时重置破甲后限制

  // ── 能量恢复：每回合开始恢复满能量 ──
  newState.energy = newState.maxEnergy;

  // ── 环境倒计时：每回合减1，归零后恢复常温 ──
  if (newState.envRoundsLeft > 0) {
    newState.envRoundsLeft--;
    if (newState.envRoundsLeft === 0) {
      newState.currentEnv = 'normal';
      newState.battleLog.push({
        round: newState.currentRound,
        type: 'system',
        message: '🌡️ 环境效果结束，战场恢复常温状态',
      });
    }
  }

  // 补充手牌到上限（固定发牌制）
  newState = replenishHand(newState);

  // 检查护甲是否需要切换（每N回合换一次）
  const interval = level.armorChangeInterval || 2;
  if (newState.currentRound % interval === 0 && newState.currentArmorIndex < level.armorSequence.length) {
    // 如果当前护甲还没破，强制切换到下一层
    if (!newState.armorBroken && newState.armorHP > 0) {
      // 不强制切换，护甲由破甲来推进
      // 但如果是同一层护甲持续太久，给出提示
    }
  }

  newState.currentRound++;
  newState.phase = 'player';

  // 检查超时失败
  if (newState.currentRound > newState.maxRounds) {
    newState.phase = 'defeat';
    newState.battleLog.push({
      round: newState.currentRound,
      type: 'system',
      message: `⏰ 超时！超过${newState.maxRounds}回合限制，战斗失败`,
      isSuccess: false,
    });
  }

  return newState;
}

/**
 * 补充手牌到上限（固定发牌制）
 * 每回合补充足够的牌使手牌达到5张上限
 * 牌库不足时，将弃牌堆全部洗回牌库
 */
export function replenishHand(state: BattleState): BattleState {
  const HAND_LIMIT = 5;
  let newState = { ...state };
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  let hand = [...state.hand];
  let cardsDrawn: string[] = [];

  // 补充牌直到达到上限
  while (hand.length < HAND_LIMIT) {
    // 牌库为空时，洗入弃牌堆
    if (drawPile.length === 0) {
      if (discardPile.length === 0) {
        // 无牌可抽
        break;
      }
      // 弃牌堆洗回牌库
      drawPile = shuffleArray([...discardPile]);
      discardPile = [];
      newState.battleLog = [...newState.battleLog, {
        round: newState.currentRound,
        type: 'system' as const,
        message: '牌库已空，弃牌堆重新洗入牌库',
      }];
    }

    // 从牌库抽一张牌
    const [drawn, ...rest] = drawPile;
    drawPile = rest;
    hand = [...hand, drawn];
    cardsDrawn.push(drawn);
  }

  // 生成补牌日志
  if (cardsDrawn.length > 0) {
    const cardNames = cardsDrawn.map(id => CARD_MAP[id]?.name ?? id).join('、');
    newState.battleLog = [...newState.battleLog, {
      round: newState.currentRound,
      type: 'system',
      message: `补充手牌：${cardNames}`,
    }];
  }

  return {
    ...newState,
    drawPile,
    hand,
    discardPile,
  };
}

/**
 * 抽一张牌（已弃用，保留向后兼容）
 */
export function drawCard(state: BattleState): BattleState {
  if (state.hand.length >= 5) {
    // 手牌已满，溢出进入弃牌堆
    if (state.drawPile.length > 0) {
      const [drawn, ...rest] = state.drawPile;
      return {
        ...state,
        drawPile: rest,
        discardPile: [...state.discardPile, drawn],
        battleLog: [...state.battleLog, {
          round: state.currentRound,
          type: 'system',
          message: `手牌已满！${CARD_MAP[drawn]?.name ?? drawn} 溢出进入弃牌堆`,
        }],
      };
    }
    return state;
  }

  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];

  // 牌库为空时，洗入弃牌堆
  if (drawPile.length === 0) {
    if (discardPile.length === 0) return state;
    drawPile = shuffleArray([...discardPile]);
    discardPile = [];
    const newState = {
      ...state,
      drawPile,
      discardPile,
      battleLog: [...state.battleLog, {
        round: state.currentRound,
        type: 'system' as const,
        message: '牌库已空，弃牌堆重新洗入牌库',
      }],
    };
    return drawCard(newState);
  }

  const [drawn, ...rest] = drawPile;
  return {
    ...state,
    drawPile: rest,
    hand: [...state.hand, drawn],
    discardPile,
    battleLog: [...state.battleLog, {
      round: state.currentRound,
      type: 'system',
      message: `抽到了 ${CARD_MAP[drawn]?.name ?? drawn}`,
    }],
  };
}

/**
 * 计算战斗评分
 */
export function calculateBattleScore(state: BattleState, level: Level): {
  stars: number;
  score: number;
  breakdown: string[];
} {
  const breakdown: string[] = [];
  let score = 0;

  // 基础分：通关
  score += 100;
  breakdown.push('通关基础分：+100');

  // 剩余HP奖励
  const hpRatio = state.playerHP / state.playerMaxHP;
  const hpBonus = Math.floor(hpRatio * 50);
  score += hpBonus;
  breakdown.push(`剩余HP ${state.playerHP}/${state.playerMaxHP}：+${hpBonus}`);

  // 回合节省奖励
  const roundsLeft = state.maxRounds - state.currentRound;
  const roundBonus = Math.max(0, roundsLeft * 10);
  score += roundBonus;
  breakdown.push(`节省${roundsLeft}回合：+${roundBonus}`);

  // 错误惩罚
  const mistakePenalty = state.totalMistakes * 15;
  score = Math.max(0, score - mistakePenalty);
  breakdown.push(`出错${state.totalMistakes}次：-${mistakePenalty}`);

  // 星级
  let stars = 1;
  if (state.totalMistakes === 0 && hpRatio > 0.5) stars = 3;
  else if (state.totalMistakes <= 2 && hpRatio > 0.3) stars = 2;

  return { stars, score, breakdown };
}

// 工具函数：洗牌（Fisher-Yates）
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 获取下一张牌库顶的牌（用于UI显示）
 */
export function peekNextCard(state: BattleState): string | null {
  return state.drawPile[0] ?? null;
}

/**
 * 获取未来N回合的护甲预告
 */
export function getArmorForecast(level: Level, state: BattleState, rounds: number): ArmorLayer[] {
  const forecast: ArmorLayer[] = [];
  let idx = state.currentArmorIndex;

  for (let i = 0; i < rounds; i++) {
    if (idx < level.armorSequence.length) {
      forecast.push(level.armorSequence[idx]);
    }
    idx++;
  }

  return forecast;
}

/**
 * 获取未来N回合的敌人行动预告
 */
export function getEnemyActionForecast(level: Level, state: BattleState, rounds: number): EnemyAction[] {
  const forecast: EnemyAction[] = [];
  for (let i = 0; i < rounds; i++) {
    const actionIndex = (state.currentRound - 1 + i) % level.enemyActions.length;
    forecast.push(level.enemyActions[actionIndex]);
  }
  return forecast;
}
