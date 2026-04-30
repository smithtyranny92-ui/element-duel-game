export type SkillType = 'none' | 'shield' | 'catalyze' | 'reveal' | 'recover' | 'neutralize' | 'displace' | 'explode' | 'corrode' | 'universal' | 'setEnv';
export type EnvType = 'normal' | 'heat' | 'ignite' | 'aqueous';

export interface ElementCard {
  id: string;
  name: string;
  symbol: string;
  family: string;
  coreDamage: number;
  skill: SkillType;
  glowColor: string;
  description: string;
  content?: string;
  equation?: string;
  reactionEquation?: string;
  skillDescription?: string;
  knowledgeCardId?: string;
  breaksArmor?: string[];
  category?: string;
  title?: string;
  funFact?: string;
  element?: string;
  // 能量费用与环境需求
  energyCost: number;          // 出牌消耗能量（0=免费工具牌）
  requiredEnv?: EnvType;       // 出牌所需战场环境（undefined/'normal'=无限制）
  envTarget?: EnvType;         // setEnv技能牌：设置的目标环境
}

export const FAMILY_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  reactive_nonmetal: { primary: '#86efac', secondary: '#22c55e', glow: '#4ade80' },
  metal: { primary: '#cbd5e1', secondary: '#94a3b8', glow: '#e2e8f0' },
  acid: { primary: '#fca5a5', secondary: '#ef4444', glow: '#f87171' },
  base: { primary: '#93c5fd', secondary: '#3b82f6', glow: '#60a5fa' },
  salt: { primary: '#c4b5fd', secondary: '#8b5cf6', glow: '#a78bfa' },
  oxide: { primary: '#fde68a', secondary: '#f59e0b', glow: '#fbbf24' },
  indicator: { primary: '#f9a8d4', secondary: '#ec4899', glow: '#f472b6' },
  inert: { primary: '#a5f3fc', secondary: '#06b6d4', glow: '#22d3ee' },
  catalyst: { primary: '#d8b4fe', secondary: '#a855f7', glow: '#c084fc' },
  compound: { primary: '#67e8f9', secondary: '#0891b2', glow: '#22d3ee' },
};

export const FAMILY_NAMES: Record<string, string> = {
  reactive_nonmetal: '活泼非金属',
  metal: '金属',
  acid: '酸',
  base: '碱',
  salt: '盐',
  oxide: '氧化物',
  indicator: '指示剂',
  inert: '稀有气体',
  catalyst: '催化剂',
  compound: '化合物',
};

const CARD_IDS = [
  'H','H2','O2','H2O','Na','Cl2','NaCl','NaOH','HCl','CaCO3','H2SO4',
  'Zn','Cu','Fe','Fe2O3','Ca','Ca_OH_2','Mg','C','CO2','Li','K',
  'He','Ar','MnO2','Litmus','Cl','Ag','Al',
  'Env_Ignite','Env_Heat','Env_Aqueous',
];

const NAMES: Record<string, string> = {
  H:'氢', H2:'氢气', O2:'氧气', H2O:'水', Na:'钠', Cl2:'氯气', NaCl:'氯化钠',
  NaOH:'氢氧化钠', HCl:'盐酸', CaCO3:'碳酸钙', H2SO4:'硫酸', Zn:'锌', Cu:'铜',
  Fe:'铁', Fe2O3:'氧化铁', Ca:'钙', Ca_OH_2:'氢氧化钙', Mg:'镁', C:'碳',
  CO2:'二氧化碳', Li:'锂', K:'钾', He:'氦', Ar:'氩', MnO2:'二氧化锰',
  Litmus:'石蕊', Cl:'氯', Ag:'银', Al:'铝',
  Env_Ignite:'打火机', Env_Heat:'酒精灯', Env_Aqueous:'烧杯',
};

const SYMBOLS: Record<string, string> = {
  ...Object.fromEntries(CARD_IDS.map((id) => [id, id])),
  H2: 'H₂', O2: 'O₂', H2O: 'H₂O', Cl2: 'Cl₂', NaCl: 'NaCl',
  NaOH: 'NaOH', HCl: 'HCl', CaCO3: 'CaCO₃', H2SO4: 'H₂SO₄',
  Fe2O3: 'Fe₂O₃', Ca_OH_2: 'Ca(OH)₂', CO2: 'CO₂', MnO2: 'MnO₂',
  Env_Ignite: '🔥', Env_Heat: '△', Env_Aqueous: '💧',
};

const FAMILY: Record<string, string> = {
  H:'reactive_nonmetal', H2:'reactive_nonmetal', O2:'reactive_nonmetal',
  H2O:'compound', Na:'metal', Cl2:'reactive_nonmetal', NaCl:'salt',
  NaOH:'base', HCl:'acid', CaCO3:'salt', H2SO4:'acid', Zn:'metal',
  Cu:'metal', Fe:'metal', Fe2O3:'oxide', Ca:'metal', Ca_OH_2:'base',
  Mg:'metal', C:'reactive_nonmetal', CO2:'oxide', Li:'metal', K:'metal',
  He:'inert', Ar:'inert', MnO2:'catalyst', Litmus:'indicator',
  Cl:'reactive_nonmetal', Ag:'metal', Al:'metal',
  Env_Ignite:'catalyst', Env_Heat:'catalyst', Env_Aqueous:'compound',
};

const DAMAGE: Record<string, number> = {
  H:2, H2:8, O2:8, H2O:4, Na:8, Cl2:8, NaCl:4, NaOH:6, HCl:7,
  CaCO3:4, H2SO4:9, Zn:7, Cu:6, Fe:6, Fe2O3:5, Ca:7, Ca_OH_2:6,
  Mg:7, C:5, CO2:5, Li:7, K:9, He:2, Ar:2, MnO2:3, Litmus:1,
  Cl:5, Ag:6, Al:6,
  Env_Ignite:0, Env_Heat:0, Env_Aqueous:0,
};

const SKILL: Record<string, SkillType> = {
  MnO2:'catalyze', Litmus:'reveal', NaOH:'neutralize',
  HCl:'corrode', H2SO4:'corrode', CaCO3:'shield', Fe2O3:'shield',
  Env_Ignite:'setEnv', Env_Heat:'setEnv', Env_Aqueous:'setEnv',
};

// 能量费用：0=免费工具牌，1=普通元素牌，2=高级反应牌
const ENERGY_COST: Record<string, number> = {
  Env_Ignite:0, Env_Heat:0, Env_Aqueous:0, MnO2:0,
  H:1, H2:2, O2:2, H2O:1, Na:1, Cl2:2, NaCl:1, NaOH:1, HCl:1,
  CaCO3:1, H2SO4:2, Zn:1, Cu:1, Fe:1, Fe2O3:1, Ca:1, Ca_OH_2:1,
  Mg:1, C:1, CO2:1, Li:1, K:1, He:1, Ar:1, Litmus:1, Cl:1, Ag:1, Al:1,
};

// 出牌所需战场环境
const REQUIRED_ENV: Record<string, EnvType> = {
  H2: 'ignite',      // H₂燃烧需点燃
  O2: 'ignite',      // O₂支持燃烧需点燃
  C:  'heat',        // 碳还原需高温
  Fe2O3: 'heat',     // 高温还原需加热
  H2O: 'aqueous',   // 水溶液环境才能发生离子反应
  HCl: 'aqueous',   // 盐酸需水溶液
  NaOH: 'aqueous',  // 强碱需水溶液
  H2SO4: 'aqueous', // 硫酸需水溶液
  Ca_OH_2: 'aqueous', // 清灰需水溶液
  Zn: 'aqueous',    // 锌置换需水溶液
  Fe: 'aqueous',    // 铁置换需水溶液
  Cu: 'aqueous',    // 铜置换需水溶液
  Al: 'aqueous',    // 铝与酸碱反应需水溶液
};

// 工具牌设置的目标环境
const ENV_TARGET: Record<string, EnvType> = {
  Env_Ignite: 'ignite',
  Env_Heat: 'heat',
  Env_Aqueous: 'aqueous',
};

const BREAKS_ARMOR: Record<string, string[]> = {
  H: [],
  H2: ['O2', 'Fe2O3'],
  O2: [],
  H2O: ['Li', 'Na', 'K'],
  Na: ['Cl'],
  Cl2: ['Fe'],
  NaCl: [],
  NaOH: ['HCl', 'CO2', 'Al'],
  HCl: ['NaOH', 'Fe', 'Fe2O3', 'CaCO3', 'Al'],
  CaCO3: [],
  H2SO4: ['NaOH', 'CaCO3', 'Al', 'Fe2O3'],
  Zn: ['Cu'],
  Cu: [],
  Fe: ['Cl', 'Cu'],
  Fe2O3: [],
  Ca: [],
  Ca_OH_2: ['HCl', 'CO2'],
  Mg: [],
  C: ['O2', 'Fe2O3'],
  CO2: [],
  Li: [],
  K: ['Cl'],
  He: [],
  Ar: [],
  MnO2: [],
  Litmus: [],
  Cl: [],
  Ag: [],
  Al: [],
  Env_Ignite: [],
  Env_Heat: [],
  Env_Aqueous: [],
};

export const CARD_MAP: Record<string, ElementCard> = Object.fromEntries(CARD_IDS.map((id) => {
  const family = FAMILY[id] ?? 'compound';
  const glowColor = FAMILY_COLORS[family]?.glow ?? '#67e8f9';
  return [id, {
    id,
    name: NAMES[id] ?? id,
    symbol: SYMBOLS[id] ?? id,
    family,
    coreDamage: DAMAGE[id] ?? 5,
    skill: SKILL[id] ?? 'none',
    glowColor,
    description: `${NAMES[id] ?? id} 的基础卡牌说明。`,
    content: `${NAMES[id] ?? id} 的详细说明将在后续补全。`,
    equation: '',
    reactionEquation: '',
    skillDescription: '',
    knowledgeCardId: `kc-${id.replace(/_/g, '')}`,
    breaksArmor: BREAKS_ARMOR[id] ?? [],
    category: FAMILY_NAMES[family] ?? '元素',
    title: NAMES[id] ?? id,
    funFact: '',
    element: id,
    energyCost: ENERGY_COST[id] ?? 1,
    requiredEnv: REQUIRED_ENV[id],
    envTarget: ENV_TARGET[id],
  }];
}));

export const ARMOR_TYPES: Record<string, { id: string; label: string; color: string; description?: string; name?: string }> = {
  oxidized: { id: 'oxidized', label: '氧化层', name: '氧化层', color: '#f97316', description: '需要合适反应才能破除。' },
  reduced: { id: 'reduced', label: '还原层', name: '还原层', color: '#60a5fa', description: '需要合适反应才能破除。' },
  acidic: { id: 'acidic', label: '酸性护甲', name: '酸性护甲', color: '#ef4444', description: '酸性状态护甲。' },
  basic: { id: 'basic', label: '碱性护甲', name: '碱性护甲', color: '#3b82f6', description: '碱性状态护甲。' },
  metallic: { id: 'metallic', label: '金属护甲', name: '金属护甲', color: '#cbd5e1', description: '金属类护甲。' },
  carbonate: { id: 'carbonate', label: '碳酸盐护甲', name: '碳酸盐护甲', color: '#a78bfa', description: '碳酸盐护甲。' },
  none: { id: 'none', label: '无护甲', name: '无护甲', color: '#94a3b8', description: '当前无护甲。' },
  O2: { id: 'O2', label: '氧气护甲', name: '氧气护甲', color: '#38bdf8', description: '可被可燃物或还原剂破除。' },
  Li: { id: 'Li', label: '锂护甲', name: '锂护甲', color: '#a3e635', description: '活泼金属，遇水反应。' },
  Na: { id: 'Na', label: '钠护甲', name: '钠护甲', color: '#f59e0b', description: '活泼金属，遇水剧烈反应。' },
  K: { id: 'K', label: '钾护甲', name: '钾护甲', color: '#ef4444', description: '极活泼金属，遇水爆烈反应。' },
  Cl: { id: 'Cl', label: '氯护甲', name: '氯护甲', color: '#84cc16', description: '可与活泼金属或铁反应。' },
  HCl: { id: 'HCl', label: '盐酸护甲', name: '盐酸护甲', color: '#f87171', description: '可被碱中和。' },
  NaOH: { id: 'NaOH', label: '氢氧化钠护甲', name: '氢氧化钠护甲', color: '#60a5fa', description: '可被酸或酸性氧化物中和。' },
  CO2: { id: 'CO2', label: '二氧化碳护甲', name: '二氧化碳护甲', color: '#94a3b8', description: '酸性氧化物，可被碱吸收。' },
  Fe: { id: 'Fe', label: '铁护甲', name: '铁护甲', color: '#9ca3af', description: '可被酸腐蚀。' },
  Cu: { id: 'Cu', label: '铜护甲', name: '铜护甲', color: '#b45309', description: '可被更活泼金属置换。' },
  Fe2O3: { id: 'Fe2O3', label: '氧化铁护甲', name: '氧化铁护甲', color: '#dc2626', description: '可被酸、碳或氢还原。' },
  CaCO3: { id: 'CaCO3', label: '碳酸钙护甲', name: '碳酸钙护甲', color: '#a78bfa', description: '可被酸溶解。' },
  Al: { id: 'Al', label: '铝护甲', name: '铝护甲', color: '#cbd5e1', description: '两性金属，可与酸或强碱反应。' },
};
