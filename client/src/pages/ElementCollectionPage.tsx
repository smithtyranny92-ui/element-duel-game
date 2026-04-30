import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CARD_MAP, FAMILY_COLORS, FAMILY_NAMES, type ElementCard } from '@/lib/cardData';

type Props = { onBack: () => void };
type CompendiumDetail = { summary: string; reaction: string; usage: string; tags: string[] };

const ELEMENT_ORDER = [
  'H2','O2','H2O','H','Na','K','Li','Cl2','Cl','NaCl','NaOH','HCl','H2SO4',
  'CaCO3','Ca_OH_2','CO2','C','Fe','Fe2O3','Zn','Cu','Ag','Al','Ca','Mg',
  'MnO2','Litmus','Ar','He',
] as const;

const FAMILY_ORDER = [
  'reactive_nonmetal','metal','acid','base','salt','oxide','compound','catalyst','indicator','inert',
] as const;

const FAMILY_DESCRIPTIONS: Record<string,string> = {
  reactive_nonmetal:'常见于燃烧、氧化和生成水等基础反应，是前期最核心的反应牌来源。',
  metal:'多用于置换反应、与酸反应和活动性比较，是第三章的重要知识核心。',
  acid:'擅长腐蚀、溶解与中和，是破除碳酸盐、铁锈和金属护甲的重要手段。',
  base:'能与酸中和，也常用于吸收 CO₂ 或处理两性金属，兼具稳定与功能性。',
  salt:'常作为反应产物或护盾材料出现，偏向衍生产物与结构类知识。',
  oxide:'既可能是氧化产物，也可能是待还原对象，经常出现在 Boss 护甲设计中。',
  compound:'兼具基础反应和辅助效果，是贯穿多章节的过渡型牌。',
  catalyst:'不会直接替代主反应物，但能显著改变出牌节奏和连段效率。',
  indicator:'偏信息型工具牌，用于揭示护甲、辅助判断而非直接输出。',
  inert:'以稳定、惰性和特殊机制见长，通常不参与常规反应但能承担功能位。',
};

const DETAIL_OVERRIDES: Record<string,CompendiumDetail> = {
  H2:{summary:'氢气是最轻的可燃气体，常作为还原剂或燃烧反应参与者，是第一章的重要入门元素。',reaction:'2H₂ + O₂ → 2H₂O',usage:'适合处理氧气相关护甲，也常在氧化还原关卡中承担基础输出。',tags:['可燃气体','还原剂','第一章核心']},
  O2:{summary:'氧气支持燃烧，也是常见氧化剂。很多入门化学反应都围绕它展开。',reaction:'C + O₂ → CO₂；3Fe + 2O₂ → Fe₃O₄',usage:'常用来理解燃烧、氧化和气体护甲，是早期判断"能否点燃/氧化"的关键牌。',tags:['氧化剂','燃烧反应','非金属']},
  H2O:{summary:'水不仅是溶剂，在游戏中还与活泼金属、恢复和衍生反应密切相关。',reaction:'2Na + 2H₂O → 2NaOH + H₂↑',usage:'在活泼金属关卡中很关键，也承担部分恢复与辅助定位。',tags:['溶剂','恢复','化合物']},
  Na:{summary:'钠是典型活泼金属，遇水剧烈反应。它代表了金属活动性的极端一侧。',reaction:'2Na + 2H₂O → 2NaOH + H₂↑',usage:'主要用于金属活动性、活泼金属判定和爆发型机制理解。',tags:['活泼金属','活动性','爆发']},
  K:{summary:'钾比钠更活泼，是活动性顺序中的高位金属，适合做"更强反应性"的教学示例。',reaction:'2K + 2H₂O → 2KOH + H₂↑',usage:'主要承担活动性对比认知，在图鉴中用于强化"同族越向下越活泼"的印象。',tags:['碱金属','高活性','活动性顺序']},
  Li:{summary:'锂是最轻的金属之一，常作为现代电池材料代表，也属于活泼金属体系。',reaction:'2Li + 2H₂O → 2LiOH + H₂↑',usage:'用于补齐碱金属认知，与 Na、K 共同构成活动性学习链。',tags:['碱金属','电池材料','金属']},
  Cl2:{summary:'氯气是强氧化性气体，兼具消毒和反应性，在氧化类和卤素知识中非常典型。',reaction:'2Fe + 3Cl₂ → 2FeCl₃',usage:'偏功能型输出牌，适合解释卤素、氧化性和点燃条件。',tags:['卤素','氧化剂','气体']},
  NaOH:{summary:'氢氧化钠是强碱，既可中和酸，也能吸收 CO₂，还能处理部分金属/两性物质。',reaction:'NaOH + HCl → NaCl + H₂O',usage:'在酸碱中和、吸收二氧化碳和破碱系护甲时非常关键。',tags:['强碱','中和','吸收 CO₂']},
  HCl:{summary:'盐酸是最常见的强酸之一，能溶解碳酸盐、铁锈并与碱发生中和反应。',reaction:'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑',usage:'广泛用于酸性破甲、溶解类机制和通用输出，是高频核心牌。',tags:['强酸','腐蚀','高频核心']},
  H2SO4:{summary:'硫酸是工业上最重要的酸之一，代表高强度腐蚀与工业化学知识。',reaction:'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',usage:'在高阶酸性关卡中常作为强力破甲或工业化学主题牌使用。',tags:['工业之母','强酸','高阶关卡']},
  CaCO3:{summary:'碳酸钙是石灰石和贝壳的主要成分，遇酸分解，是碳酸盐体系的代表。',reaction:'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑',usage:'常作为护盾、碳酸盐护甲或石灰石循环的核心概念牌。',tags:['碳酸盐','护盾','石灰石循环']},
  Ca_OH_2:{summary:'氢氧化钙俗称熟石灰，能吸收 CO₂，也是"石灰水变浑浊"经典实验的主角。',reaction:'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O',usage:'在 CO₂ 处理和石灰石循环关卡中特别重要，兼具基础输出和知识辨识度。',tags:['熟石灰','吸收 CO₂','检验气体']},
  CO2:{summary:'二氧化碳是碳完全燃烧产物，也是酸性氧化物，能被碱或石灰水吸收。',reaction:'CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O',usage:'常用于衔接燃烧、碳循环和酸性氧化物知识，是第二章核心概念之一。',tags:['酸性氧化物','燃烧产物','碳循环']},
  C:{summary:'碳既能燃烧，也能在高温下还原金属氧化物，是氧化还原与工业化学的关键角色。',reaction:'C + O₂ → CO₂；Fe₂O₃ + 3C → 2Fe + 3CO₂',usage:'既能承担燃烧路线，也能进入还原路线，是高阶关卡常见关键牌。',tags:['还原剂','燃烧','工业化学']},
  Fe:{summary:'铁是金属活动性教学中的中位金属，也是锈蚀、置换和工业炼铁的中心元素。',reaction:'Fe + CuSO₄ → FeSO₄ + Cu',usage:'主要用于置换反应、金属对比和氧化还原教学。',tags:['金属活动性','置换','铁系主题']},
  Fe2O3:{summary:'氧化铁是铁锈主要成分，可被酸溶解，也可被碳、氢气等还原剂还原。',reaction:'Fe₂O₃ + 3CO → 2Fe + 3CO₂',usage:'经常作为 Boss 护甲和知识关卡中的"待还原对象"出现。',tags:['铁锈','氧化物','待还原']},
  Zn:{summary:'锌比铁更活泼，是置换反应中常用的"更强金属"示例。',reaction:'Zn + H₂SO₄ → ZnSO₄ + H₂↑',usage:'适合用于活动性顺序和金属置换链的教学与破甲判断。',tags:['置换反应','较活泼金属','酸反应']},
  Cu:{summary:'铜活动性较弱，常作为被置换对象出现，是金属活动性顺序的重要参照点。',reaction:'Fe + CuSO₄ → FeSO₄ + Cu',usage:'多用于"谁能置换谁"的教学判断。',tags:['弱活性金属','参照元素','置换对象']},
  Al:{summary:'铝是典型两性金属，既能与酸反应也能与碱反应，是中高阶关卡的重要转折点。',reaction:'2Al + 2NaOH + 2H₂O → 2NaAlO₂ + 3H₂↑',usage:'用于讲解"两性金属"与酸碱双解法，是很有辨识度的特殊金属牌。',tags:['两性金属','酸碱双解','中高阶']},
  MnO2:{summary:'二氧化锰是经典催化剂，自己不被消耗，却能改变整个回合的出牌效率。',reaction:'2H₂O₂ →(MnO₂) 2H₂O + O₂↑',usage:'主要承担催化、连段和节奏优化功能，是操作感最强的功能牌之一。',tags:['催化剂','连段','节奏牌']},
  Litmus:{summary:'石蕊不是输出牌，而是判断酸碱性的重要指示剂，在信息博弈中价值很高。',reaction:'酸性变红，碱性变蓝',usage:'适合探测护甲属性、减少误判，是典型信息型辅助牌。',tags:['指示剂','信息辅助','酸碱判断']},
  Ar:{summary:'氩气化学性质稳定，在游戏中更像"惰性保护位"，常承担防守或特殊机制。',reaction:'常规条件下不参与反应',usage:'适合承担护盾、缓冲与机制位，而不是直接反应输出。',tags:['稀有气体','惰性','防守位']},
  He:{summary:'氦气是最轻的稀有气体，几乎不参与常规反应，更偏知识补完型元素。',reaction:'常规条件下不参与反应',usage:'用于补齐稀有气体认知，强化"惰性元素"的整体概念。',tags:['稀有气体','惰性','知识补完']},
};

function getSkillLabel(card: ElementCard) {
  const labels: Record<string,string> = {
    none:'无主动技能',catalyze:'催化连段',reveal:'揭示护甲',
    neutralize:'中和处理',corrode:'腐蚀处理',shield:'生成护盾',recover:'回复衍生',
  };
  return labels[card.skill] ?? '特殊技能';
}

function buildDetail(card: ElementCard): CompendiumDetail {
  const override = DETAIL_OVERRIDES[card.id];
  if (override) return override;
  const familyName = FAMILY_NAMES[card.family] ?? '元素';
  const breaksArmor = card.breaksArmor?.length ? `可关联护甲：${card.breaksArmor.join('、')}` : '主要作为通用知识或辅助牌使用。';
  return {
    summary:`${card.name} 属于${familyName}，在本作中更偏向${getSkillLabel(card)}与基础反应学习。`,
    reaction:card.equation || card.reactionEquation || '当前图鉴尚未为该条目补入专属方程式。',
    usage:`${breaksArmor} 基础伤害为 ${card.coreDamage}，适合与同族或相邻知识点一起记忆。`,
    tags:[familyName,getSkillLabel(card),`伤害 ${card.coreDamage}`],
  };
}

export default function ElementCollectionPage({ onBack }: Props) {
  const cards = useMemo(() => ELEMENT_ORDER.map((id) => CARD_MAP[id]).filter(Boolean), []);
  const [selectedFamily, setSelectedFamily] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string>(cards[0]?.id ?? 'H2');

  const familyCounts = useMemo(() => {
    const counter: Record<string,number> = {};
    cards.forEach((card) => { counter[card.family] = (counter[card.family] ?? 0) + 1; });
    return counter;
  }, [cards]);

  const visibleCards = useMemo(
    () => selectedFamily === 'all' ? cards : cards.filter((c) => c.family === selectedFamily),
    [cards, selectedFamily],
  );

  const selectedCard = visibleCards.find((c) => c.id === selectedId) ?? cards.find((c) => c.id === selectedId) ?? cards[0];
  const selectedDetail = buildDetail(selectedCard);
  const fc = FAMILY_COLORS[selectedCard.family] ?? FAMILY_COLORS.compound;

  return (
    <div className="relative flex flex-col" style={{width:'100%',height:'100%',minHeight:'100%',background:'#04080d',overflow:'hidden',color:'#fff'}}>
      {/* 背景 */}
      <div className="absolute inset-0" style={{backgroundImage:"url('/bg-levels.jpg')",backgroundSize:'cover',backgroundPosition:'center',opacity:0.10}} />
      <motion.div
        className="absolute inset-0"
        animate={{background:`radial-gradient(ellipse at 50% 0%, ${fc.glow}28 0%, transparent 50%), linear-gradient(180deg, rgba(2,5,10,0.94) 0%, rgba(3,8,14,0.80) 40%, rgba(2,5,10,0.97) 100%)`}}
        transition={{duration:0.5}}
      />
      <motion.div
        className="absolute top-0 left-0 right-0"
        animate={{background:`linear-gradient(90deg, transparent 0%, ${fc.primary}55 50%, transparent 100%)`}}
        transition={{duration:0.5}}
        style={{height:1}}
      />

      {/* 顶部标题栏 */}
      <div className="relative z-20 flex items-center px-4 pt-10 pb-3" style={{gap:10,flexShrink:0}}>
        <button onClick={onBack} style={{width:34,height:34,borderRadius:11,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.75)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div style={{color:'rgba(255,255,255,0.35)',fontSize:'0.58rem',textTransform:'uppercase',letterSpacing:'0.24em',marginBottom:1}}>Element Compendium</div>
          <div style={{color:'#ffffff',fontSize:'1.10rem',fontWeight:700,letterSpacing:'0.04em'}}>元素图鉴</div>
        </div>
        <div style={{padding:'3px 10px',borderRadius:999,background:'rgba(34,211,238,0.10)',border:'1px solid rgba(34,211,238,0.22)',color:'#a5f3fc',fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.10em'}}>
          {cards.length} 项
        </div>
      </div>

      {/* 选中元素详情区（固定不滚动）*/}
      <div className="relative z-20 px-4 pb-3" style={{flexShrink:0}}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCard.id}
            initial={{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            exit={{opacity:0,y:-10}}
            transition={{duration:0.22}}
            style={{
              borderRadius:22,
              background:`linear-gradient(145deg, rgba(6,12,20,0.98) 0%, ${fc.primary}18 100%)`,
              border:`1px solid ${fc.primary}44`,
              boxShadow:`0 0 28px ${fc.glow}28, 0 4px 20px rgba(0,0,0,0.40)`,
              overflow:'hidden',position:'relative',
            }}
          >
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent 0%, ${fc.primary}88 50%, transparent 100%)`}} />

            {/* 主信息行 */}
            <div className="flex items-start" style={{padding:'16px 16px 12px',gap:14}}>
              {/* 元素符号大字 */}
              <div style={{
                width:72,height:72,borderRadius:20,flexShrink:0,
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                background:`radial-gradient(circle at 50% 35%, ${fc.primary}30 0%, rgba(0,0,0,0.50) 100%)`,
                border:`1.5px solid ${fc.primary}55`,
                boxShadow:`0 0 20px ${fc.glow}30, inset 0 1px 0 ${fc.primary}22`,
                position:'relative',overflow:'hidden',
              }}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:'45%',background:`linear-gradient(180deg, ${fc.primary}18 0%, transparent 100%)`,borderRadius:'20px 20px 0 0'}} />
                <div style={{color:fc.primary,fontSize:'1.75rem',fontWeight:900,lineHeight:1,letterSpacing:'-0.02em',position:'relative',zIndex:1}}>{selectedCard.symbol}</div>
                <div style={{color:`${fc.primary}88`,fontSize:'0.52rem',fontWeight:700,letterSpacing:'0.06em',marginTop:3,position:'relative',zIndex:1}}>{selectedCard.id}</div>
              </div>

              {/* 名称与分类 */}
              <div className="flex-1 min-w-0">
                <div style={{color:'rgba(255,255,255,0.94)',fontSize:'1.10rem',fontWeight:800,letterSpacing:'0.02em',lineHeight:1.2,marginBottom:4}}>{selectedCard.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                  <span style={{padding:'2px 8px',borderRadius:999,background:`${fc.primary}18`,border:`1px solid ${fc.primary}33`,color:fc.primary,fontSize:'0.60rem',fontWeight:700,letterSpacing:'0.08em'}}>
                    {FAMILY_NAMES[selectedCard.family] ?? '元素'}
                  </span>
                  <span style={{padding:'2px 8px',borderRadius:999,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',color:'rgba(255,255,255,0.55)',fontSize:'0.60rem',fontWeight:600}}>
                    {getSkillLabel(selectedCard)}
                  </span>
                </div>
                <div style={{color:'rgba(255,255,255,0.62)',fontSize:'0.72rem',lineHeight:1.65}}>{selectedDetail.summary}</div>
              </div>

              {/* 伤害数值 */}
              <div style={{flexShrink:0,textAlign:'center'}}>
                <div style={{color:fc.primary,fontSize:'1.60rem',fontWeight:900,lineHeight:1}}>{selectedCard.coreDamage}</div>
                <div style={{color:'rgba(255,255,255,0.35)',fontSize:'0.50rem',letterSpacing:'0.08em',marginTop:2}}>ATK</div>
              </div>
            </div>

            {/* 分隔线 */}
            <div style={{height:1,background:`linear-gradient(90deg, transparent 0%, ${fc.primary}22 50%, transparent 100%)`,margin:'0 16px'}} />

            {/* 核心反应方程式 */}
            <div style={{padding:'12px 16px 14px'}}>
              <div style={{color:'rgba(255,255,255,0.30)',fontSize:'0.56rem',textTransform:'uppercase',letterSpacing:'0.16em',marginBottom:7}}>核心反应方程式</div>
              <div style={{
                padding:'10px 12px',borderRadius:12,
                background:'rgba(255,255,255,0.04)',
                border:`1px solid ${fc.primary}22`,
                color:fc.primary,fontSize:'0.80rem',fontWeight:700,lineHeight:1.7,letterSpacing:'0.02em',
              }}>
                {selectedDetail.reaction}
              </div>
              <div style={{color:'rgba(255,255,255,0.55)',fontSize:'0.70rem',lineHeight:1.65,marginTop:10}}>{selectedDetail.usage}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
                {selectedDetail.tags.map((tag) => (
                  <span key={tag} style={{padding:'3px 9px',borderRadius:999,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.10)',color:'rgba(255,255,255,0.72)',fontSize:'0.65rem',fontWeight:600}}>{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 分类筛选横向滚动 */}
      <div className="relative z-20 px-4 pb-2" style={{flexShrink:0}}>
        <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:2}}>
          <button
            onClick={() => setSelectedFamily('all')}
            style={{flexShrink:0,padding:'6px 11px',borderRadius:999,border:`1px solid ${selectedFamily==='all'?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.08)'}`,background:selectedFamily==='all'?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.03)',color:selectedFamily==='all'?'rgba(255,255,255,0.92)':'rgba(255,255,255,0.48)',fontSize:'0.68rem',fontWeight:700}}
          >全部 {cards.length}</button>
          {FAMILY_ORDER.filter((f) => familyCounts[f]).map((family) => {
            const fc2 = FAMILY_COLORS[family] ?? FAMILY_COLORS.compound;
            const isActive = selectedFamily === family;
            return (
              <button key={family}
                onClick={() => { setSelectedFamily(family); const next = cards.find((c) => c.family===family); if(next) setSelectedId(next.id); }}
                style={{flexShrink:0,padding:'6px 11px',borderRadius:999,border:`1px solid ${isActive?fc2.primary+'55':'rgba(255,255,255,0.08)'}`,background:isActive?`${fc2.primary}18`:'rgba(255,255,255,0.03)',color:isActive?fc2.primary:'rgba(255,255,255,0.48)',fontSize:'0.68rem',fontWeight:700,transition:'all 0.2s'}}
              >{FAMILY_NAMES[family]} {familyCounts[family]}</button>
            );
          })}
        </div>
      </div>

      {/* 元素卡片网格（可滚动）*/}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6" style={{paddingTop:4}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:8}}>
          {visibleCards.map((card) => {
            const colors = FAMILY_COLORS[card.family] ?? FAMILY_COLORS.compound;
            const isActive = card.id === selectedId;
            return (
              <motion.button key={card.id} onClick={() => setSelectedId(card.id)} whileTap={{scale:0.94}}
                style={{
                  textAlign:'center',borderRadius:16,padding:'11px 8px 10px',
                  border:`1px solid ${isActive?colors.primary+'66':'rgba(255,255,255,0.07)'}`,
                  background:isActive?`linear-gradient(180deg, ${colors.primary}22 0%, rgba(6,12,20,0.95) 100%)`:'rgba(7,13,20,0.88)',
                  boxShadow:isActive?`0 0 16px ${colors.glow}30`:'none',
                  position:'relative',overflow:'hidden',transition:'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {isActive && <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent 0%, ${colors.primary}88 50%, transparent 100%)`}} />}
                <div style={{color:isActive?colors.primary:'rgba(255,255,255,0.55)',fontSize:'1.30rem',fontWeight:900,lineHeight:1,letterSpacing:'-0.02em',marginBottom:5}}>{card.symbol}</div>
                <div style={{color:isActive?'rgba(255,255,255,0.90)':'rgba(255,255,255,0.55)',fontSize:'0.62rem',fontWeight:600,lineHeight:1.3,marginBottom:4}}>{card.name}</div>
                <div style={{display:'inline-block',padding:'1px 6px',borderRadius:999,background:isActive?`${colors.primary}20`:'rgba(255,255,255,0.05)',border:`1px solid ${isActive?colors.primary+'33':'rgba(255,255,255,0.08)'}`,color:isActive?colors.primary:'rgba(255,255,255,0.35)',fontSize:'0.55rem',fontWeight:700}}>{card.coreDamage}</div>
              </motion.button>
            );
          })}
        </div>
        {selectedFamily !== 'all' && (
          <div style={{marginTop:12,padding:'12px 14px',borderRadius:16,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div style={{color:'rgba(255,255,255,0.28)',fontSize:'0.58rem',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>分类说明</div>
            <div style={{color:'rgba(255,255,255,0.62)',fontSize:'0.70rem',lineHeight:1.7}}>{FAMILY_DESCRIPTIONS[selectedFamily]}</div>
          </div>
        )}
      </div>
    </div>
  );
}
