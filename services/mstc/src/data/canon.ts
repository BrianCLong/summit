import {
  CanonicalTerm,
  LocaleCanonMap,
  RegulatorNote,
  Variant,
} from '../types';
import { normalize, sortBy, unique } from '../utils';
import type { Vertical } from '../types';

const TERM_VERTICALS: Record<string, Vertical> = {
  'health.meds.opioids': 'health',
  'health.meds.contraceptives': 'health',
  'health.diseases.sti': 'health',
  'finance.scams.ponzi': 'finance',
  'finance.credit.loan_shark': 'finance',
  'finance.gambling.sports_betting': 'finance',
  'minors.exploitation.grooming': 'minors',
  'minors.abuse.cyberbullying': 'minors',
  'minors.suicide.self_harm': 'minors',
  'workplace.harassment.sexual': 'workplace',
  'workplace.discrimination.equal_pay': 'workplace',
  'workplace.violence.threats': 'workplace',
};

const REGULATOR_NOTES: Record<string, Record<Vertical, RegulatorNote>> = {
  'en-US': {
    health: {
      regulator: 'FDA / DEA',
      note: 'Controlled substances scheduling and REMS monitoring for opioids and reproductive health.',
    },
    finance: {
      regulator: 'SEC / CFPB',
      note: 'Targets deceptive lending, Ponzi advertising, and unlicensed wagering inducements.',
    },
    minors: {
      regulator: 'FTC / COPPA Office',
      note: 'Online harms to minors under COPPA and related harmful content advisories.',
    },
    workplace: {
      regulator: 'EEOC / OSHA',
      note: 'Enforces anti-harassment, equal pay, and workplace violence prevention rules.',
    },
  },
  'en-GB': {
    health: {
      regulator: 'MHRA',
      note: 'Misuse of Drugs Act scheduling and reproductive health advertising codes.',
    },
    finance: {
      regulator: 'FCA',
      note: 'Financial promotions rules cover Ponzi-style claims and predatory lending.',
    },
    minors: {
      regulator: 'UK Safer Internet / CEOP',
      note: 'Online Safety Act duties around grooming, bullying, and self-harm content for minors.',
    },
    workplace: {
      regulator: 'EHRC / HSE',
      note: 'Guidance on sexual harassment, pay equity, and violence prevention in workplaces.',
    },
  },
  'es-ES': {
    health: {
      regulator: 'AEMPS',
      note: 'Control de medicamentos sujetos a fiscalización y campañas de salud sexual.',
    },
    finance: {
      regulator: 'CNMV',
      note: 'Supervisa fraudes piramidales y crédito abusivo en publicidad financiera.',
    },
    minors: {
      regulator: 'AEPD / INCIBE',
      note: 'Protocolos sobre grooming, ciberacoso y conductas autolesivas en línea.',
    },
    workplace: {
      regulator: 'Inspección de Trabajo',
      note: 'Vigila acoso laboral, igualdad retributiva y violencia en centros de trabajo.',
    },
  },
  'es-MX': {
    health: {
      regulator: 'COFEPRIS',
      note: 'Vigilancia de medicamentos controlados y difusión de salud reproductiva.',
    },
    finance: {
      regulator: 'CNBV / CONDUSEF',
      note: 'Supervisa esquemas piramidales y crédito depredador en mercados digitales.',
    },
    minors: {
      regulator: 'SIPINNA / IFT',
      note: 'Lineamientos para proteger a menores de grooming, ciberacoso y retos autolesivos.',
    },
    workplace: {
      regulator: 'STPS',
      note: 'Normas Oficiales Mexicanas sobre acoso, equidad salarial y violencia laboral.',
    },
  },
  'fr-FR': {
    health: {
      regulator: 'ANSM',
      note: 'Surveillance des stupéfiants et de la communication sur la contraception d’urgence.',
    },
    finance: {
      regulator: 'AMF',
      note: 'Contrôle des fraudes financières, prêts usuraires et paris illégaux.',
    },
    minors: {
      regulator: 'CNIL',
      note: 'Plans nationaux contre le cyberharcèlement et les contenus dangereux pour mineurs.',
    },
    workplace: {
      regulator: 'Ministère du Travail',
      note: 'Plans égalité professionnelle et prévention des violences en entreprise.',
    },
  },
  'fr-CA': {
    health: {
      regulator: 'Santé Canada',
      note: 'Programmes de surveillance des opioïdes et information sur la contraception d’urgence.',
    },
    finance: {
      regulator: 'AMF Québec / OSFI',
      note: 'Surveille les fraudes d’investissement et le crédit prédateur transfrontalier.',
    },
    minors: {
      regulator: 'Commissariat à la protection de la vie privée',
      note: 'Directives sur l’exploitation en ligne et le cyberharcèlement des jeunes.',
    },
    workplace: {
      regulator: 'CNESST',
      note: 'Normes du travail sur le harcèlement sexuel, l’équité salariale et la violence.',
    },
  },
  'de-DE': {
    health: {
      regulator: 'BfArM',
      note: 'Betäubungsmittelgesetz und Aufklärung zur Notfallverhütung.',
    },
    finance: {
      regulator: 'BaFin',
      note: 'Warnungen zu Schneeballsystemen, Wucher und illegalen Sportwetten.',
    },
    minors: {
      regulator: 'BzKJ',
      note: 'Jugendschutzprogramme gegen Grooming, Cybermobbing und Selbstgefährdung.',
    },
    workplace: {
      regulator: 'BAuA',
      note: 'Empfehlungen zu sexueller Belästigung, Entgeltgleichheit und Gewaltprävention.',
    },
  },
  'it-IT': {
    health: {
      regulator: 'AIFA',
      note: 'Controllo su oppiacei e campagne sulla contraccezione d’emergenza.',
    },
    finance: {
      regulator: 'CONSOB',
      note: 'Contrasto a schemi Ponzi, usura e scommesse clandestine.',
    },
    minors: {
      regulator: 'Garante Infanzia e Adolescenza',
      note: 'Linee guida contro adescamento, cyberbullismo e istigazione all’autolesionismo.',
    },
    workplace: {
      regulator: 'INL',
      note: 'Ispezioni su molestie, parità retributiva e minacce nei luoghi di lavoro.',
    },
  },
  'pt-BR': {
    health: {
      regulator: 'ANVISA',
      note: 'Controle de opioides e campanhas de saúde sexual e reprodutiva.',
    },
    finance: {
      regulator: 'Banco Central / CVM',
      note: 'Fiscaliza pirâmides financeiras, agiotagem e apostas ilegais.',
    },
    minors: {
      regulator: 'ECA / SaferNet',
      note: 'Protocolos sobre aliciamento, cyberbullying e incentivo à autolesão.',
    },
    workplace: {
      regulator: 'MPT',
      note: 'Combate ao assédio, discriminação salarial e violência ocupacional.',
    },
  },
  'pt-PT': {
    health: {
      regulator: 'INFARMED',
      note: 'Regula opióides controlados e comunicação sobre contraceção de emergência.',
    },
    finance: {
      regulator: 'CMVM',
      note: 'Fiscaliza esquemas Ponzi, crédito usurário e apostas ilegais.',
    },
    minors: {
      regulator: 'CNPD',
      note: 'Orientações sobre aliciamento online, cyberbullying e autolesão.',
    },
    workplace: {
      regulator: 'ACT',
      note: 'Inspeções sobre assédio, igualdade salarial e violência laboral.',
    },
  },
  'zh-CN': {
    health: {
      regulator: 'NMPA',
      note: '监测管制药品与紧急避孕信息发布。',
    },
    finance: {
      regulator: 'CSRC',
      note: '打击庞氏骗局、高利贷及非法体育博彩宣传。',
    },
    minors: {
      regulator: 'CAC',
      note: '未成年人网络保护要求涵盖诱骗、网暴及自残内容。',
    },
    workplace: {
      regulator: 'MOHRSS',
      note: '劳动监察关注性骚扰、同酬与职场暴力。',
    },
  },
  'zh-TW': {
    health: {
      regulator: 'TFDA',
      note: '監管管制藥品與緊急避孕相關宣導。',
    },
    finance: {
      regulator: 'FSC',
      note: '防制龐氏詐騙、高利貸與地下運彩招攬。',
    },
    minors: {
      regulator: 'NCC / 教育部',
      note: '保護兒少免於網路誘騙、霸凌與自傷訊息。',
    },
    workplace: {
      regulator: 'MOL',
      note: '職安法規聚焦性騷擾、同工同酬與暴力事件。',
    },
  },
  'ja-JP': {
    health: {
      regulator: 'MHLW / PMDA',
      note: '医薬品の乱用防止と緊急避妊薬情報の適正提供を監督。',
    },
    finance: {
      regulator: 'FSA',
      note: '投資詐欺、ヤミ金、違法賭博の勧誘を監視。',
    },
    minors: {
      regulator: 'こども家庭庁',
      note: '子どものネット上の誘拐、いじめ、自傷誘引を監視。',
    },
    workplace: {
      regulator: 'MHLW',
      note: '職場でのセクハラ、賃金差別、暴力対策を指導。',
    },
  },
  'ko-KR': {
    health: {
      regulator: 'MFDS',
      note: '오피오이드 관리와 응급피임 정보 제공을 감독.',
    },
    finance: {
      regulator: 'FSC / FSS',
      note: '폰지 사기, 대부업, 불법 스포츠 도박 광고를 단속.',
    },
    minors: {
      regulator: 'KCC',
      note: '미성년자 대상 그루밍, 사이버 괴롭힘, 자해 조장 콘텐츠를 모니터링.',
    },
    workplace: {
      regulator: 'MOEL',
      note: '직장 내 성희롱, 임금차별, 폭력 예방 지침을 시행.',
    },
  },
  'ar-SA': {
    health: {
      regulator: 'SFDA',
      note: 'مراقبة الأدوية الخاضعة للرقابة والتوعية بالصحة الإنجابية.',
    },
    finance: {
      regulator: 'SAMA',
      note: 'تنظم أنشطة الاحتيال الهرمي والإقراض الجائر والمراهنات الرياضية غير النظامية.',
    },
    minors: {
      regulator: 'CITC',
      note: 'إطار حماية القُصّر من الاستدراج، التنمر الإلكتروني، ومحتوى إيذاء النفس.',
    },
    workplace: {
      regulator: 'HRSD',
      note: 'إرشادات منع التحرش، التمييز في الأجور، والعنف في أماكن العمل.',
    },
  },
  'hi-IN': {
    health: {
      regulator: 'CDSCO',
      note: 'नियंत्रित ओपिओइड और आपातकालीन गर्भनिरोध पर दिशानिर्देश।',
    },
    finance: {
      regulator: 'RBI / SEBI',
      note: 'पोंज़ी योजनाओं, सूदखोरी और अवैध सट्टेबाजी पर निगरानी।',
    },
    minors: {
      regulator: 'NCPCR',
      note: 'ऑनलाइन ग्रूमिंग, साइबर बुलिंग और आत्म-हानि उकसावे के विरुद्ध प्रोटोकॉल।',
    },
    workplace: {
      regulator: 'Ministry of Labour & Employment',
      note: 'यौन उत्पीड़न, वेतन समानता और कार्यस्थल हिंसा पर कानूनों का प्रवर्तन।',
    },
  },
  'nl-NL': {
    health: {
      regulator: 'CBG-MEB',
      note: 'Toezicht op opioïden en communicatie rond noodanticonceptie.',
    },
    finance: {
      regulator: 'AFM',
      note: 'Let op piramidespelen, woekerrente en illegale gokreclames.',
    },
    minors: {
      regulator: 'Autoriteit Persoonsgegevens',
      note: 'Bescherming van minderjarigen tegen grooming, cyberpesten en zelfbeschadiging.',
    },
    workplace: {
      regulator: 'Inspectie SZW',
      note: 'Handhaaft regels tegen seksuele intimidatie, loonkloof en geweld op het werk.',
    },
  },
  'sv-SE': {
    health: {
      regulator: 'Läkemedelsverket',
      note: 'Övervakar opioider och information om akutpreventivmedel.',
    },
    finance: {
      regulator: 'Finansinspektionen',
      note: 'Varna för pyramidspel, ockerlån och olaglig sportbetting.',
    },
    minors: {
      regulator: 'Barnombudsmannen',
      note: 'Skyddar barn mot nätgrooming, nätmobbning och självskadeinnehåll.',
    },
    workplace: {
      regulator: 'Arbetsmiljöverket',
      note: 'Fokuserar på sexuella trakasserier, lönediskriminering och våld på arbetsplatser.',
    },
  },
  'da-DK': {
    health: {
      regulator: 'Lægemiddelstyrelsen',
      note: 'Kontrol med opioider og kommunikation om nødprævention.',
    },
    finance: {
      regulator: 'Finanstilsynet',
      note: 'Advarer mod pyramidespil, åger og ulovlige sportsvæddemål.',
    },
    minors: {
      regulator: 'Datatilsynet / Børns Vilkår',
      note: 'Retningslinjer mod grooming, cybermobning og selvskadende indhold.',
    },
    workplace: {
      regulator: 'Arbejdstilsynet',
      note: 'Fører tilsyn med seksuel chikane, ligeløn og vold på arbejdspladsen.',
    },
  },
  'fi-FI': {
    health: {
      regulator: 'Fimea',
      note: 'Valvoo opioideja ja tiedotusta hätäehkäisystä.',
    },
    finance: {
      regulator: 'Finanssivalvonta',
      note: 'Torjuu pyramidihuijauksia, koronkiskontaa ja laitonta vedonlyöntiä.',
    },
    minors: {
      regulator: 'Lapsiasiavaltuutettu',
      note: 'Ohjeistaa suojelemaan lapsia houkuttelulta, nettikiusaamiselta ja itsevahingoilta.',
    },
    workplace: {
      regulator: 'Työsuojelu',
      note: 'Valvoo seksuaalista häirintää, palkkasyrjintää ja väkivaltaa työpaikoilla.',
    },
  },
};

interface LocaleTermSeed {
  canonical: string;
  variants: Variant[];
  confidence: number;
}

const LOCALE_TERMS: Record<string, Record<string, LocaleTermSeed>> = {
  'en-US': {
    'health.meds.opioids': {
      canonical: 'opioid painkillers',
      variants: [
        { type: 'alias', value: 'prescription opioids' },
        { type: 'slang', value: 'oxy' },
        { type: 'slang', value: 'hillbilly heroin' },
        { type: 'misspelling', value: 'opiod pain killers' },
      ],
      confidence: 0.97,
    },
    'health.meds.contraceptives': {
      canonical: 'emergency contraceptive pill',
      variants: [
        { type: 'alias', value: 'plan b pill' },
        { type: 'alias', value: 'morning after pill' },
        { type: 'misspelling', value: 'planb' },
        { type: 'slang', value: 'day after dose' },
      ],
      confidence: 0.94,
    },
    'health.diseases.sti': {
      canonical: 'sexually transmitted infection screening',
      variants: [
        { type: 'alias', value: 'sti test' },
        { type: 'alias', value: 'std panel' },
        { type: 'misspelling', value: 'std chek' },
        { type: 'slang', value: 'clinic std check' },
      ],
      confidence: 0.92,
    },
    'finance.scams.ponzi': {
      canonical: 'Ponzi investment scheme',
      variants: [
        { type: 'alias', value: 'pyramid scheme' },
        { type: 'slang', value: 'get rich quick pool' },
        { type: 'misspelling', value: 'ponzzi scheme' },
      ],
      confidence: 0.95,
    },
    'finance.credit.loan_shark': {
      canonical: 'loan shark lending',
      variants: [
        { type: 'alias', value: 'predatory loan' },
        { type: 'slang', value: 'payday trap' },
        { type: 'misspelling', value: 'loanshark' },
        { type: 'alias', value: 'illegal lending' },
      ],
      confidence: 0.93,
    },
    'finance.gambling.sports_betting': {
      canonical: 'illegal sports betting',
      variants: [
        { type: 'alias', value: 'underground sportsbook' },
        { type: 'slang', value: 'proxy betting' },
        { type: 'misspelling', value: 'sportz betting' },
      ],
      confidence: 0.9,
    },
    'minors.exploitation.grooming': {
      canonical: 'online grooming minors',
      variants: [
        { type: 'alias', value: 'child grooming' },
        { type: 'slang', value: 'age play chat' },
        { type: 'misspelling', value: 'groomming kids' },
      ],
      confidence: 0.96,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'cyberbullying minors',
      variants: [
        { type: 'alias', value: 'cyber bully kids' },
        { type: 'slang', value: 'digital harassment' },
        { type: 'misspelling', value: 'cyberbulling' },
      ],
      confidence: 0.91,
    },
    'minors.suicide.self_harm': {
      canonical: 'self-harm encouragement',
      variants: [
        { type: 'alias', value: 'self harm challenge' },
        { type: 'slang', value: 'kms tips' },
        { type: 'misspelling', value: 'selfharm' },
      ],
      confidence: 0.95,
    },
    'workplace.harassment.sexual': {
      canonical: 'workplace sexual harassment',
      variants: [
        { type: 'alias', value: 'quid pro quo harassment' },
        { type: 'alias', value: 'hostile work environment' },
        { type: 'misspelling', value: 'sexual harasment' },
      ],
      confidence: 0.96,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'equal pay violation',
      variants: [
        { type: 'alias', value: 'pay discrimination' },
        { type: 'slang', value: 'wage gap complaint' },
        { type: 'misspelling', value: 'equalpay' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'workplace violence threat',
      variants: [
        { type: 'alias', value: 'threat at work' },
        { type: 'slang', value: 'office attack warning' },
        { type: 'misspelling', value: 'work place threat' },
      ],
      confidence: 0.94,
    },
  },
  'en-GB': {
    'health.meds.opioids': {
      canonical: 'opioid analgesics',
      variants: [
        { type: 'alias', value: 'controlled opioids' },
        { type: 'slang', value: 'oxy tabs' },
        { type: 'misspelling', value: 'opiate painkillers' },
      ],
      confidence: 0.96,
    },
    'health.meds.contraceptives': {
      canonical: 'morning-after tablet',
      variants: [
        { type: 'alias', value: 'emergency contraception' },
        { type: 'alias', value: 'plan b tablet' },
        { type: 'misspelling', value: 'morning after pil' },
      ],
      confidence: 0.93,
    },
    'health.diseases.sti': {
      canonical: 'sexual health screening',
      variants: [
        { type: 'alias', value: 'sti check' },
        { type: 'alias', value: 'std clinic test' },
        { type: 'misspelling', value: 'sti sceening' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'Ponzi-style investment',
      variants: [
        { type: 'alias', value: 'pyramid selling' },
        { type: 'slang', value: 'get rich quick club' },
        { type: 'misspelling', value: 'ponzie scheme' },
      ],
      confidence: 0.94,
    },
    'finance.credit.loan_shark': {
      canonical: 'loan sharking',
      variants: [
        { type: 'alias', value: 'illegal money lending' },
        { type: 'slang', value: 'payday sting' },
        { type: 'misspelling', value: 'loan-sharking' },
      ],
      confidence: 0.92,
    },
    'finance.gambling.sports_betting': {
      canonical: 'unlicensed sports betting',
      variants: [
        { type: 'alias', value: 'underground bookie' },
        { type: 'slang', value: 'mates rates betting' },
        { type: 'misspelling', value: 'sport betting illegal' },
      ],
      confidence: 0.89,
    },
    'minors.exploitation.grooming': {
      canonical: 'online grooming of minors',
      variants: [
        { type: 'alias', value: 'child grooming uk' },
        { type: 'slang', value: 'age-gap chat' },
        { type: 'misspelling', value: 'grooming minors online' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'cyber bullying towards children',
      variants: [
        { type: 'alias', value: 'online bullying pupils' },
        { type: 'slang', value: 'digital slagging' },
        { type: 'misspelling', value: 'cyberbullyng' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'self-harm promotion',
      variants: [
        { type: 'alias', value: 'suicide pact forum' },
        { type: 'slang', value: 'kms chat' },
        { type: 'misspelling', value: 'self harm advise' },
      ],
      confidence: 0.94,
    },
    'workplace.harassment.sexual': {
      canonical: 'sexual harassment at work',
      variants: [
        { type: 'alias', value: 'quid pro quo uk' },
        { type: 'alias', value: 'inappropriate touching at office' },
        { type: 'misspelling', value: 'sexual harrassment' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'pay equality breach',
      variants: [
        { type: 'alias', value: 'gender pay gap claim' },
        { type: 'slang', value: 'salary bias case' },
        { type: 'misspelling', value: 'equal pay breach' },
      ],
      confidence: 0.88,
    },
    'workplace.violence.threats': {
      canonical: 'threat of workplace violence',
      variants: [
        { type: 'alias', value: 'threatening coworker' },
        { type: 'slang', value: 'office fight threat' },
        { type: 'misspelling', value: 'workplace threat' },
      ],
      confidence: 0.92,
    },
  },
  'es-ES': {
    'health.meds.opioids': {
      canonical: 'analgésicos opioides',
      variants: [
        { type: 'alias', value: 'opioides recetados' },
        { type: 'slang', value: 'oxicodona' },
        { type: 'misspelling', value: 'analgesicos opioides' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'píldora anticonceptiva de emergencia',
      variants: [
        { type: 'alias', value: 'píldora del día después' },
        { type: 'alias', value: 'plan b españa' },
        { type: 'misspelling', value: 'pildora dia despues' },
      ],
      confidence: 0.93,
    },
    'health.diseases.sti': {
      canonical: 'cribado de infecciones de transmisión sexual',
      variants: [
        { type: 'alias', value: 'prueba its' },
        { type: 'alias', value: 'test ets' },
        { type: 'misspelling', value: 'prueba its gratis' },
      ],
      confidence: 0.91,
    },
    'finance.scams.ponzi': {
      canonical: 'esquema de inversión Ponzi',
      variants: [
        { type: 'alias', value: 'estafa piramidal' },
        { type: 'slang', value: 'chiringuito financiero' },
        { type: 'misspelling', value: 'ponzy' },
      ],
      confidence: 0.94,
    },
    'finance.credit.loan_shark': {
      canonical: 'préstamos de usura',
      variants: [
        { type: 'alias', value: 'prestamistas abusivos' },
        { type: 'slang', value: 'crédito gota a gota' },
        { type: 'misspelling', value: 'prestamo usurero' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'apuestas deportivas ilegales',
      variants: [
        { type: 'alias', value: 'casa de apuestas clandestina' },
        { type: 'slang', value: 'quiniela negra' },
        { type: 'misspelling', value: 'apuesta deportiva ilegal' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'grooming en línea a menores',
      variants: [
        { type: 'alias', value: 'ciberacoso sexual menores' },
        { type: 'slang', value: 'enganche online' },
        { type: 'misspelling', value: 'grooming menores' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'ciberacoso a menores',
      variants: [
        { type: 'alias', value: 'bullying digital' },
        { type: 'slang', value: 'hate online' },
        { type: 'misspelling', value: 'ciberacoso infantil' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'incitación a la autolesión',
      variants: [
        { type: 'alias', value: 'reto autolesivo' },
        { type: 'slang', value: 'foro suicidio' },
        { type: 'misspelling', value: 'autolesion' },
      ],
      confidence: 0.94,
    },
    'workplace.harassment.sexual': {
      canonical: 'acoso sexual laboral',
      variants: [
        { type: 'alias', value: 'acoso en el trabajo' },
        { type: 'slang', value: 'chantaje sexual oficina' },
        { type: 'misspelling', value: 'acoso sexua' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'discriminación salarial',
      variants: [
        { type: 'alias', value: 'brecha salarial' },
        { type: 'slang', value: 'igualdad retributiva' },
        { type: 'misspelling', value: 'discriminacion salarial' },
      ],
      confidence: 0.9,
    },
    'workplace.violence.threats': {
      canonical: 'amenaza de violencia laboral',
      variants: [
        { type: 'alias', value: 'amenaza en el trabajo' },
        { type: 'slang', value: 'pelea oficina' },
        { type: 'misspelling', value: 'violencia laboral' },
      ],
      confidence: 0.92,
    },
  },
  'es-MX': {
    'health.meds.opioids': {
      canonical: 'analgésicos opioides',
      variants: [
        { type: 'alias', value: 'opioides controlados' },
        { type: 'slang', value: 'oxicontin' },
        { type: 'misspelling', value: 'opioides analgesicos' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'pastilla anticonceptiva de emergencia',
      variants: [
        { type: 'alias', value: 'pastilla del día siguiente' },
        { type: 'alias', value: 'plan b méxico' },
        { type: 'misspelling', value: 'pastilla dia siguiente' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'prueba de infecciones de transmisión sexual',
      variants: [
        { type: 'alias', value: 'prueba its gratuita' },
        { type: 'alias', value: 'test de ets' },
        { type: 'misspelling', value: 'prueba its rapida' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'fraude Ponzi',
      variants: [
        { type: 'alias', value: 'fraude piramidal' },
        { type: 'slang', value: 'tanda milagro' },
        { type: 'misspelling', value: 'ponci' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'crédito gota a gota',
      variants: [
        { type: 'alias', value: 'prestamistas abusivos' },
        { type: 'slang', value: 'cobra diario' },
        { type: 'misspelling', value: 'gota a gota' },
      ],
      confidence: 0.91,
    },
    'finance.gambling.sports_betting': {
      canonical: 'apuestas deportivas clandestinas',
      variants: [
        { type: 'alias', value: 'casa de apuestas ilegal' },
        { type: 'slang', value: 'quiniela clandestina' },
        { type: 'misspelling', value: 'apuestas deportivas ilegal' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'grooming a menores en línea',
      variants: [
        { type: 'alias', value: 'ciberacoso sexual infantil' },
        { type: 'slang', value: 'enganche digital' },
        { type: 'misspelling', value: 'grooming infantil' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'ciberacoso infantil',
      variants: [
        { type: 'alias', value: 'bullying en redes' },
        { type: 'slang', value: 'linchamiento digital' },
        { type: 'misspelling', value: 'ciberbullying niños' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'incitación a autolesión',
      variants: [
        { type: 'alias', value: 'reto suicida' },
        { type: 'slang', value: 'foro autolesivo' },
        { type: 'misspelling', value: 'autolesion mx' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'acoso sexual laboral',
      variants: [
        { type: 'alias', value: 'hostigamiento sexual trabajo' },
        { type: 'slang', value: 'favores para ascenso' },
        { type: 'misspelling', value: 'acoso laboral sexual' },
      ],
      confidence: 0.94,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'brecha salarial',
      variants: [
        { type: 'alias', value: 'discriminación salarial' },
        { type: 'slang', value: 'salario desigual' },
        { type: 'misspelling', value: 'brecha salarial mx' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'amenaza de violencia en el trabajo',
      variants: [
        { type: 'alias', value: 'violencia laboral' },
        { type: 'slang', value: 'pleito oficina' },
        { type: 'misspelling', value: 'amenaza trabajo' },
      ],
      confidence: 0.91,
    },
  },
  'fr-FR': {
    'health.meds.opioids': {
      canonical: 'analgésiques opioïdes',
      variants: [
        { type: 'alias', value: 'opioïdes sur ordonnance' },
        { type: 'slang', value: 'oxycontin' },
        { type: 'misspelling', value: 'analgesiques opioides' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: "pilule contraceptive d'urgence",
      variants: [
        { type: 'alias', value: 'pilule du lendemain' },
        { type: 'alias', value: 'plan b france' },
        { type: 'misspelling', value: 'pilule urgence' },
      ],
      confidence: 0.94,
    },
    'health.diseases.sti': {
      canonical: 'dépistage des infections sexuellement transmissibles',
      variants: [
        { type: 'alias', value: 'test ist' },
        { type: 'alias', value: 'dépistage mst' },
        { type: 'misspelling', value: 'depistage ist' },
      ],
      confidence: 0.92,
    },
    'finance.scams.ponzi': {
      canonical: "schéma d'investissement Ponzi",
      variants: [
        { type: 'alias', value: 'arnaque pyramidale' },
        { type: 'slang', value: 'plan miracle' },
        { type: 'misspelling', value: 'ponzi france' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'prêt usuraire',
      variants: [
        { type: 'alias', value: 'prêteur sur gages illégal' },
        { type: 'slang', value: 'credit requin' },
        { type: 'misspelling', value: 'pret usure' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'paris sportifs illégaux',
      variants: [
        { type: 'alias', value: 'bookmaker clandestin' },
        { type: 'slang', value: 'pari sauvage' },
        { type: 'misspelling', value: 'pari sportif illegal' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'grooming en ligne de mineurs',
      variants: [
        { type: 'alias', value: 'sollicitation sexuelle mineur' },
        { type: 'slang', value: 'approche prédateur' },
        { type: 'misspelling', value: 'grooming mineur' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'cyberharcèlement de mineurs',
      variants: [
        { type: 'alias', value: 'harcèlement en ligne élèves' },
        { type: 'slang', value: 'lynchage numérique' },
        { type: 'misspelling', value: 'cyber harcelement' },
      ],
      confidence: 0.91,
    },
    'minors.suicide.self_harm': {
      canonical: "incitation à l'automutilation",
      variants: [
        { type: 'alias', value: 'défi automutilation' },
        { type: 'slang', value: 'forum suicide' },
        { type: 'misspelling', value: 'automutilation' },
      ],
      confidence: 0.94,
    },
    'workplace.harassment.sexual': {
      canonical: 'harcèlement sexuel au travail',
      variants: [
        { type: 'alias', value: 'chantage sexuel bureau' },
        { type: 'slang', value: 'harcelement workplace' },
        { type: 'misspelling', value: 'harcelement sexuel' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'inégalité salariale',
      variants: [
        { type: 'alias', value: 'écart de rémunération' },
        { type: 'slang', value: 'discrimination paye' },
        { type: 'misspelling', value: 'inegalite salariale' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'menace de violence au travail',
      variants: [
        { type: 'alias', value: 'menace collègue' },
        { type: 'slang', value: 'bagarre bureau' },
        { type: 'misspelling', value: 'violence travail' },
      ],
      confidence: 0.91,
    },
  },
  'fr-CA': {
    'health.meds.opioids': {
      canonical: 'analgésiques opioïdes',
      variants: [
        { type: 'alias', value: 'opioïdes prescrits' },
        { type: 'slang', value: 'oxy québec' },
        { type: 'misspelling', value: 'analgesiques opioides ca' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'pilule contraceptive d’urgence',
      variants: [
        { type: 'alias', value: 'pilule du lendemain qc' },
        { type: 'alias', value: 'plan b canada' },
        { type: 'misspelling', value: 'pilule urgence ca' },
      ],
      confidence: 0.93,
    },
    'health.diseases.sti': {
      canonical: 'dépistage des ITSS',
      variants: [
        { type: 'alias', value: 'test ist canada' },
        { type: 'alias', value: 'dépistage mst' },
        { type: 'misspelling', value: 'depistage itss' },
      ],
      confidence: 0.91,
    },
    'finance.scams.ponzi': {
      canonical: 'stratagème de type Ponzi',
      variants: [
        { type: 'alias', value: 'fraude pyramidale' },
        { type: 'slang', value: 'club miracle' },
        { type: 'misspelling', value: 'ponzi qc' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'prêt usuraire illégal',
      variants: [
        { type: 'alias', value: 'prêteur à gages illégal' },
        { type: 'slang', value: 'shark financier' },
        { type: 'misspelling', value: 'pret usuraire' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'paris sportifs non autorisés',
      variants: [
        { type: 'alias', value: 'bookmaker illégal' },
        { type: 'slang', value: 'pari sportif clandestin' },
        { type: 'misspelling', value: 'pari sportif illegal ca' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'grooming en ligne de jeunes',
      variants: [
        { type: 'alias', value: 'sollicitation sexuelle adolescent' },
        { type: 'slang', value: 'prédateur web' },
        { type: 'misspelling', value: 'grooming jeunes' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'cyberintimidation envers les jeunes',
      variants: [
        { type: 'alias', value: 'intimidation en ligne' },
        { type: 'slang', value: 'bashing web' },
        { type: 'misspelling', value: 'cyber intimidation' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'incitation à l’automutilation',
      variants: [
        { type: 'alias', value: 'défi autodestruction' },
        { type: 'slang', value: 'forum suicide qc' },
        { type: 'misspelling', value: 'automutilation ca' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'harcèlement sexuel au travail',
      variants: [
        { type: 'alias', value: 'harcèlement psychologique' },
        { type: 'slang', value: 'chantage promotion' },
        { type: 'misspelling', value: 'harcelement travail' },
      ],
      confidence: 0.94,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'injustice salariale',
      variants: [
        { type: 'alias', value: 'équité salariale' },
        { type: 'slang', value: 'écart salarial' },
        { type: 'misspelling', value: 'inegalite salaire' },
      ],
      confidence: 0.88,
    },
    'workplace.violence.threats': {
      canonical: 'menace de violence en milieu de travail',
      variants: [
        { type: 'alias', value: 'menace collègue' },
        { type: 'slang', value: 'bagarre bureau qc' },
        { type: 'misspelling', value: 'violence travail ca' },
      ],
      confidence: 0.91,
    },
  },
  'de-DE': {
    'health.meds.opioids': {
      canonical: 'Opioid-Schmerzmittel',
      variants: [
        { type: 'alias', value: 'verschreibungspflichtige Opioide' },
        { type: 'slang', value: 'Oxy' },
        { type: 'misspelling', value: 'Opioid Schmerzmittel' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'Pille danach',
      variants: [
        { type: 'alias', value: 'Notfallverhütung' },
        { type: 'alias', value: 'Plan B Deutschland' },
        { type: 'misspelling', value: 'pille danac' },
      ],
      confidence: 0.93,
    },
    'health.diseases.sti': {
      canonical: 'Test auf sexuell übertragbare Infektionen',
      variants: [
        { type: 'alias', value: 'STI Test' },
        { type: 'alias', value: 'STD Untersuchung' },
        { type: 'misspelling', value: 'sti test kostenlos' },
      ],
      confidence: 0.91,
    },
    'finance.scams.ponzi': {
      canonical: 'Ponzi-Anlagebetrug',
      variants: [
        { type: 'alias', value: 'Schneeballsystem' },
        { type: 'slang', value: 'schnell reich system' },
        { type: 'misspelling', value: 'ponzi betrug' },
      ],
      confidence: 0.94,
    },
    'finance.credit.loan_shark': {
      canonical: 'Wucher-Darlehen',
      variants: [
        { type: 'alias', value: 'Kredithaie' },
        { type: 'slang', value: 'schnellkredit abzocke' },
        { type: 'misspelling', value: 'wucher darlehen' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'illegale Sportwetten',
      variants: [
        { type: 'alias', value: 'Untergrund Wettbüro' },
        { type: 'slang', value: 'schwarz wetten' },
        { type: 'misspelling', value: 'sportwetten illegal' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'Online-Grooming von Minderjährigen',
      variants: [
        { type: 'alias', value: 'Kinderansprache online' },
        { type: 'slang', value: 'predator chat de' },
        { type: 'misspelling', value: 'grooming minderjährige' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'Cybermobbing gegen Kinder',
      variants: [
        { type: 'alias', value: 'Mobbing im Netz' },
        { type: 'slang', value: 'hassgruppe' },
        { type: 'misspelling', value: 'cyber mobbing' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'Anstiftung zur Selbstverletzung',
      variants: [
        { type: 'alias', value: 'Selbstharm Challenge' },
        { type: 'slang', value: 'suizid forum de' },
        { type: 'misspelling', value: 'selbstverletzung' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'sexuelle Belästigung am Arbeitsplatz',
      variants: [
        { type: 'alias', value: 'Belästigung Büro' },
        { type: 'slang', value: 'chef verlangt gefallen' },
        { type: 'misspelling', value: 'sexuelle belästigug' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'Lohnungleichheit',
      variants: [
        { type: 'alias', value: 'Gender Pay Gap' },
        { type: 'slang', value: 'ungleiche bezahlung' },
        { type: 'misspelling', value: 'lohn ungleichheit' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'Drohung mit Arbeitsgewalt',
      variants: [
        { type: 'alias', value: 'Gewaltdrohung Büro' },
        { type: 'slang', value: 'kollege droht' },
        { type: 'misspelling', value: 'arbeitsplatz gewalt' },
      ],
      confidence: 0.91,
    },
  },
  'it-IT': {
    'health.meds.opioids': {
      canonical: 'analgesici oppioidi',
      variants: [
        { type: 'alias', value: 'oppioidi su prescrizione' },
        { type: 'slang', value: 'ossicodone' },
        { type: 'misspelling', value: 'analgesici oppioidi it' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'pillola anticoncezionale d’emergenza',
      variants: [
        { type: 'alias', value: 'pillola del giorno dopo' },
        { type: 'alias', value: 'plan b italia' },
        { type: 'misspelling', value: 'pillola giorno dopo' },
      ],
      confidence: 0.93,
    },
    'health.diseases.sti': {
      canonical: 'screening per infezioni sessualmente trasmissibili',
      variants: [
        { type: 'alias', value: 'test ist' },
        { type: 'alias', value: 'test mst' },
        { type: 'misspelling', value: 'test ist gratuito' },
      ],
      confidence: 0.91,
    },
    'finance.scams.ponzi': {
      canonical: 'schema Ponzi',
      variants: [
        { type: 'alias', value: 'catena di Sant’Antonio' },
        { type: 'slang', value: 'investimento miracoloso' },
        { type: 'misspelling', value: 'ponzy italia' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'usura creditizia',
      variants: [
        { type: 'alias', value: 'strozzinaggio' },
        { type: 'slang', value: 'prestito a strozzo' },
        { type: 'misspelling', value: 'usura prestito' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'scommesse sportive illegali',
      variants: [
        { type: 'alias', value: 'centro scommesse clandestino' },
        { type: 'slang', value: 'bolletta nera' },
        { type: 'misspelling', value: 'scommessa illegale' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'adescamento online di minori',
      variants: [
        { type: 'alias', value: 'grooming minori' },
        { type: 'slang', value: 'predatore chat it' },
        { type: 'misspelling', value: 'adescamento minore' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'cyberbullismo contro minori',
      variants: [
        { type: 'alias', value: 'bullismo online' },
        { type: 'slang', value: 'shitstorm ragazzi' },
        { type: 'misspelling', value: 'cyber bullismo' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'istigazione all’autolesionismo',
      variants: [
        { type: 'alias', value: 'sfida autolesiva' },
        { type: 'slang', value: 'forum suicidio it' },
        { type: 'misspelling', value: 'autolesionismo' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'molestie sessuali sul lavoro',
      variants: [
        { type: 'alias', value: 'ricatto sessuale lavoro' },
        { type: 'slang', value: 'favori sessuali ufficio' },
        { type: 'misspelling', value: 'molestie sessuai' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'disparità retributiva',
      variants: [
        { type: 'alias', value: 'divario salariale' },
        { type: 'slang', value: 'stipendio ingiusto' },
        { type: 'misspelling', value: 'disparita salariale' },
      ],
      confidence: 0.88,
    },
    'workplace.violence.threats': {
      canonical: 'minaccia di violenza sul lavoro',
      variants: [
        { type: 'alias', value: 'minacce in ufficio' },
        { type: 'slang', value: 'lite in azienda' },
        { type: 'misspelling', value: 'violenza lavoro' },
      ],
      confidence: 0.91,
    },
  },
  'pt-BR': {
    'health.meds.opioids': {
      canonical: 'analgésicos opioides',
      variants: [
        { type: 'alias', value: 'opioides controlados' },
        { type: 'slang', value: 'oxicodona br' },
        { type: 'misspelling', value: 'analgesicos opioides' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'pílula anticoncepcional de emergência',
      variants: [
        { type: 'alias', value: 'pílula do dia seguinte' },
        { type: 'alias', value: 'plan b brasil' },
        { type: 'misspelling', value: 'pilula dia seguinte' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'teste de infecções sexualmente transmissíveis',
      variants: [
        { type: 'alias', value: 'teste ist gratuito' },
        { type: 'alias', value: 'exame dst' },
        { type: 'misspelling', value: 'teste ist rapido' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'pirâmide financeira Ponzi',
      variants: [
        { type: 'alias', value: 'esquema piramidal' },
        { type: 'slang', value: 'ganhe rápido' },
        { type: 'misspelling', value: 'ponzy brasil' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'agiotagem',
      variants: [
        { type: 'alias', value: 'empréstimo abusivo' },
        { type: 'slang', value: 'dinheiro rápido juros' },
        { type: 'misspelling', value: 'agiota' },
      ],
      confidence: 0.91,
    },
    'finance.gambling.sports_betting': {
      canonical: 'apostas esportivas ilegais',
      variants: [
        { type: 'alias', value: 'casa de aposta clandestina' },
        { type: 'slang', value: 'bolão proibido' },
        { type: 'misspelling', value: 'aposta esportiva ilegal' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'grooming online de menores',
      variants: [
        { type: 'alias', value: 'aliciamento infantil' },
        { type: 'slang', value: 'predador digital' },
        { type: 'misspelling', value: 'grooming menor' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'cyberbullying infantil',
      variants: [
        { type: 'alias', value: 'bullying virtual' },
        { type: 'slang', value: 'linchamento online' },
        { type: 'misspelling', value: 'cyberbullyng' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'incitação à automutilação',
      variants: [
        { type: 'alias', value: 'desafio suicida' },
        { type: 'slang', value: 'forum auto lesão' },
        { type: 'misspelling', value: 'automutilacao' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'assédio sexual no trabalho',
      variants: [
        { type: 'alias', value: 'assédio moral e sexual' },
        { type: 'slang', value: 'favor para promoção' },
        { type: 'misspelling', value: 'assedio sexual' },
      ],
      confidence: 0.94,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'discriminação salarial',
      variants: [
        { type: 'alias', value: 'diferença salarial' },
        { type: 'slang', value: 'salário desigual' },
        { type: 'misspelling', value: 'discriminacao salarial' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'ameaça de violência no trabalho',
      variants: [
        { type: 'alias', value: 'violência laboral' },
        { type: 'slang', value: 'briga escritório' },
        { type: 'misspelling', value: 'ameaca trabalho' },
      ],
      confidence: 0.91,
    },
  },
  'pt-PT': {
    'health.meds.opioids': {
      canonical: 'analgésicos opióides',
      variants: [
        { type: 'alias', value: 'opióides sujeitos a receita' },
        { type: 'slang', value: 'oxicodona pt' },
        { type: 'misspelling', value: 'analgesicos opioides pt' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'pílula contracetiva de emergência',
      variants: [
        { type: 'alias', value: 'pílula do dia seguinte' },
        { type: 'alias', value: 'plan b portugal' },
        { type: 'misspelling', value: 'pilula dia seguinte pt' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'rastreiode infeções sexualmente transmissíveis',
      variants: [
        { type: 'alias', value: 'teste ist' },
        { type: 'alias', value: 'teste mst' },
        { type: 'misspelling', value: 'rastreo ist' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'esquema Ponzi',
      variants: [
        { type: 'alias', value: 'esquema piramidal' },
        { type: 'slang', value: 'investimento milagroso' },
        { type: 'misspelling', value: 'ponzi pt' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'empréstimo usurário',
      variants: [
        { type: 'alias', value: 'agiota portugal' },
        { type: 'slang', value: 'dinheiro rápido juros' },
        { type: 'misspelling', value: 'emprestimo usurario' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'apostas desportivas ilegais',
      variants: [
        { type: 'alias', value: 'casa de apostas clandestina' },
        { type: 'slang', value: 'aposta negra' },
        { type: 'misspelling', value: 'apostas ilegais' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'grooming online de menores',
      variants: [
        { type: 'alias', value: 'aliciamento sexual' },
        { type: 'slang', value: 'predador digital pt' },
        { type: 'misspelling', value: 'grooming menores' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'ciberbullying infantil',
      variants: [
        { type: 'alias', value: 'bullying online' },
        { type: 'slang', value: 'linchamento digital' },
        { type: 'misspelling', value: 'ciber bulling' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'incitação à automutilação',
      variants: [
        { type: 'alias', value: 'desafio autolesivo' },
        { type: 'slang', value: 'forum suicidio pt' },
        { type: 'misspelling', value: 'automutilacao pt' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'assédio sexual no trabalho',
      variants: [
        { type: 'alias', value: 'chantagem sexual trabalho' },
        { type: 'slang', value: 'favores por emprego' },
        { type: 'misspelling', value: 'assedio sexual pt' },
      ],
      confidence: 0.94,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'disparidade salarial',
      variants: [
        { type: 'alias', value: 'desigualdade salarial' },
        { type: 'slang', value: 'salario injusto' },
        { type: 'misspelling', value: 'disparidade salarial pt' },
      ],
      confidence: 0.88,
    },
    'workplace.violence.threats': {
      canonical: 'ameaça de violência laboral',
      variants: [
        { type: 'alias', value: 'ameaça no emprego' },
        { type: 'slang', value: 'briga no escritório' },
        { type: 'misspelling', value: 'violencia laboral pt' },
      ],
      confidence: 0.91,
    },
  },
  'zh-CN': {
    'health.meds.opioids': {
      canonical: '阿片类止痛药',
      variants: [
        { type: 'alias', value: '处方阿片' },
        { type: 'slang', value: '羟考酮' },
        { type: 'transliteration', value: 'a pian zhi tong yao' },
      ],
      confidence: 0.96,
    },
    'health.meds.contraceptives': {
      canonical: '紧急避孕药',
      variants: [
        { type: 'alias', value: '事后避孕药' },
        { type: 'alias', value: 'plan b 药片' },
        { type: 'misspelling', value: '緊急避孕藥' },
      ],
      confidence: 0.94,
    },
    'health.diseases.sti': {
      canonical: '性传播感染筛查',
      variants: [
        { type: 'alias', value: '性病检测' },
        { type: 'alias', value: 'sti 检测' },
        { type: 'misspelling', value: '性傳播感染篩查' },
      ],
      confidence: 0.92,
    },
    'finance.scams.ponzi': {
      canonical: '庞氏投资骗局',
      variants: [
        { type: 'alias', value: '传销式骗局' },
        { type: 'slang', value: '快速致富盘' },
        { type: 'misspelling', value: '龐氏騙局' },
      ],
      confidence: 0.94,
    },
    'finance.credit.loan_shark': {
      canonical: '高利贷放贷',
      variants: [
        { type: 'alias', value: '套路贷' },
        { type: 'slang', value: '现金贷陷阱' },
        { type: 'transliteration', value: 'gao li dai' },
      ],
      confidence: 0.92,
    },
    'finance.gambling.sports_betting': {
      canonical: '非法体育博彩',
      variants: [
        { type: 'alias', value: '地下赌球' },
        { type: 'slang', value: '外围盘口' },
        { type: 'misspelling', value: '非法體育博彩' },
      ],
      confidence: 0.9,
    },
    'minors.exploitation.grooming': {
      canonical: '未成年人网络诱骗',
      variants: [
        { type: 'alias', value: '儿童网络引诱' },
        { type: 'slang', value: '线上掠夺者' },
        { type: 'transliteration', value: 'wang luo you pian' },
      ],
      confidence: 0.96,
    },
    'minors.abuse.cyberbullying': {
      canonical: '未成年人网络霸凌',
      variants: [
        { type: 'alias', value: '青少年网暴' },
        { type: 'slang', value: '网暴儿童' },
        { type: 'misspelling', value: '網絡霸凌' },
      ],
      confidence: 0.91,
    },
    'minors.suicide.self_harm': {
      canonical: '鼓励自残内容',
      variants: [
        { type: 'alias', value: '自残挑战' },
        { type: 'slang', value: '轻生群' },
        { type: 'transliteration', value: 'zi can nei rong' },
      ],
      confidence: 0.95,
    },
    'workplace.harassment.sexual': {
      canonical: '职场性骚扰',
      variants: [
        { type: 'alias', value: '办公室性骚扰' },
        { type: 'slang', value: '潜规则' },
        { type: 'misspelling', value: '職場性騷擾' },
      ],
      confidence: 0.96,
    },
    'workplace.discrimination.equal_pay': {
      canonical: '同工不同酬',
      variants: [
        { type: 'alias', value: '薪酬歧视' },
        { type: 'slang', value: '工资差距' },
        { type: 'transliteration', value: 'gong zi cha ju' },
      ],
      confidence: 0.9,
    },
    'workplace.violence.threats': {
      canonical: '职场暴力威胁',
      variants: [
        { type: 'alias', value: '办公室暴力' },
        { type: 'slang', value: '砸场子' },
        { type: 'misspelling', value: '職場暴力威脅' },
      ],
      confidence: 0.93,
    },
  },
  'zh-TW': {
    'health.meds.opioids': {
      canonical: '鴉片類止痛藥',
      variants: [
        { type: 'alias', value: '處方鴉片' },
        { type: 'slang', value: '羥考酮' },
        { type: 'transliteration', value: 'ya pian zhi tong yao' },
      ],
      confidence: 0.96,
    },
    'health.meds.contraceptives': {
      canonical: '緊急避孕藥',
      variants: [
        { type: 'alias', value: '事後避孕藥' },
        { type: 'alias', value: 'plan b 台灣' },
        { type: 'misspelling', value: '緊急避孕藥品' },
      ],
      confidence: 0.94,
    },
    'health.diseases.sti': {
      canonical: '性傳染病篩檢',
      variants: [
        { type: 'alias', value: '性病檢測' },
        { type: 'alias', value: 'sti 檢驗' },
        { type: 'misspelling', value: '性傳染病檢查' },
      ],
      confidence: 0.92,
    },
    'finance.scams.ponzi': {
      canonical: '龐氏投資詐騙',
      variants: [
        { type: 'alias', value: '老鼠會' },
        { type: 'slang', value: '快速致富盤' },
        { type: 'misspelling', value: '龐氏詐騙' },
      ],
      confidence: 0.94,
    },
    'finance.credit.loan_shark': {
      canonical: '高利貸放款',
      variants: [
        { type: 'alias', value: '地下錢莊' },
        { type: 'slang', value: '日收本利' },
        { type: 'transliteration', value: 'gao li dai' },
      ],
      confidence: 0.92,
    },
    'finance.gambling.sports_betting': {
      canonical: '非法體育賭博',
      variants: [
        { type: 'alias', value: '地下球版' },
        { type: 'slang', value: '外圍盤口' },
        { type: 'misspelling', value: '非法體育博弈' },
      ],
      confidence: 0.9,
    },
    'minors.exploitation.grooming': {
      canonical: '網路誘騙未成年人',
      variants: [
        { type: 'alias', value: '兒少網路引誘' },
        { type: 'slang', value: '線上掠奪者' },
        { type: 'transliteration', value: 'wang luo you pian' },
      ],
      confidence: 0.96,
    },
    'minors.abuse.cyberbullying': {
      canonical: '網路霸凌兒少',
      variants: [
        { type: 'alias', value: '青少年網暴' },
        { type: 'slang', value: '網路公審' },
        { type: 'misspelling', value: '網路霸凌兒童' },
      ],
      confidence: 0.91,
    },
    'minors.suicide.self_harm': {
      canonical: '鼓動自傷內容',
      variants: [
        { type: 'alias', value: '自殘挑戰' },
        { type: 'slang', value: '輕生群組' },
        { type: 'transliteration', value: 'zi shang nei rong' },
      ],
      confidence: 0.95,
    },
    'workplace.harassment.sexual': {
      canonical: '職場性騷擾',
      variants: [
        { type: 'alias', value: '辦公室性騷擾' },
        { type: 'slang', value: '潛規則' },
        { type: 'misspelling', value: '職場性騷擾案' },
      ],
      confidence: 0.96,
    },
    'workplace.discrimination.equal_pay': {
      canonical: '同工不同酬',
      variants: [
        { type: 'alias', value: '薪資歧視' },
        { type: 'slang', value: '薪水差距' },
        { type: 'transliteration', value: 'tong gong bu tong chou' },
      ],
      confidence: 0.9,
    },
    'workplace.violence.threats': {
      canonical: '職場暴力威脅',
      variants: [
        { type: 'alias', value: '辦公室暴力' },
        { type: 'slang', value: '鬧場' },
        { type: 'misspelling', value: '職場暴力' },
      ],
      confidence: 0.93,
    },
  },
  'ja-JP': {
    'health.meds.opioids': {
      canonical: 'オピオイド鎮痛薬',
      variants: [
        { type: 'alias', value: '処方オピオイド' },
        { type: 'slang', value: 'オキシ' },
        { type: 'transliteration', value: 'opioido chin tsuu yaku' },
      ],
      confidence: 0.96,
    },
    'health.meds.contraceptives': {
      canonical: '緊急避妊薬',
      variants: [
        { type: 'alias', value: 'アフターピル' },
        { type: 'alias', value: 'プランB 日本' },
        { type: 'misspelling', value: '緊急避妊藥' },
      ],
      confidence: 0.94,
    },
    'health.diseases.sti': {
      canonical: '性感染症検査',
      variants: [
        { type: 'alias', value: 'STI検査' },
        { type: 'alias', value: '性病検査' },
        { type: 'misspelling', value: '性感染症 檢査' },
      ],
      confidence: 0.92,
    },
    'finance.scams.ponzi': {
      canonical: 'ポンジ投資詐欺',
      variants: [
        { type: 'alias', value: 'ねずみ講' },
        { type: 'slang', value: '楽して儲け話' },
        { type: 'misspelling', value: 'ポンジ詐欺' },
      ],
      confidence: 0.94,
    },
    'finance.credit.loan_shark': {
      canonical: 'ヤミ金融',
      variants: [
        { type: 'alias', value: '高利貸し' },
        { type: 'slang', value: '闇金' },
        { type: 'transliteration', value: 'yami kin yu' },
      ],
      confidence: 0.92,
    },
    'finance.gambling.sports_betting': {
      canonical: '違法スポーツ賭博',
      variants: [
        { type: 'alias', value: '闇賭け屋' },
        { type: 'slang', value: '闇ブックメーカー' },
        { type: 'misspelling', value: '違法スポーツ賭け' },
      ],
      confidence: 0.9,
    },
    'minors.exploitation.grooming': {
      canonical: '未成年へのオンライングルーミング',
      variants: [
        { type: 'alias', value: '子どもネット誘引' },
        { type: 'slang', value: '年の差チャット' },
        { type: 'misspelling', value: 'グルーミング未成年' },
      ],
      confidence: 0.96,
    },
    'minors.abuse.cyberbullying': {
      canonical: '未成年へのネットいじめ',
      variants: [
        { type: 'alias', value: 'サイバーいじめ' },
        { type: 'slang', value: '晒し投稿' },
        { type: 'misspelling', value: 'サイバー虐め' },
      ],
      confidence: 0.91,
    },
    'minors.suicide.self_harm': {
      canonical: '自傷行為を煽る内容',
      variants: [
        { type: 'alias', value: '自傷チャレンジ' },
        { type: 'slang', value: '死にたい掲示板' },
        { type: 'misspelling', value: '自傷煽り' },
      ],
      confidence: 0.95,
    },
    'workplace.harassment.sexual': {
      canonical: '職場でのセクハラ',
      variants: [
        { type: 'alias', value: 'セクシャルハラスメント' },
        { type: 'slang', value: '昇進の見返り' },
        { type: 'misspelling', value: 'セクハラ 仕事' },
      ],
      confidence: 0.96,
    },
    'workplace.discrimination.equal_pay': {
      canonical: '賃金差別',
      variants: [
        { type: 'alias', value: '同一賃金違反' },
        { type: 'slang', value: '給料ギャップ' },
        { type: 'misspelling', value: '賃金差別 日本' },
      ],
      confidence: 0.9,
    },
    'workplace.violence.threats': {
      canonical: '職場の暴力脅迫',
      variants: [
        { type: 'alias', value: '職場暴力' },
        { type: 'slang', value: '殴るぞ発言' },
        { type: 'misspelling', value: '職場 暴力脅し' },
      ],
      confidence: 0.93,
    },
  },
  'ko-KR': {
    'health.meds.opioids': {
      canonical: '오피오이드 진통제',
      variants: [
        { type: 'alias', value: '처방 오피오이드' },
        { type: 'slang', value: '옥시코돈' },
        { type: 'transliteration', value: 'opioid jintongje' },
      ],
      confidence: 0.96,
    },
    'health.meds.contraceptives': {
      canonical: '응급 피임약',
      variants: [
        { type: 'alias', value: '사후 피임약' },
        { type: 'alias', value: '플랜B 한국' },
        { type: 'misspelling', value: '응급피임약' },
      ],
      confidence: 0.93,
    },
    'health.diseases.sti': {
      canonical: '성매개감염 검사',
      variants: [
        { type: 'alias', value: '성병 검사' },
        { type: 'alias', value: 'STI 검사' },
        { type: 'misspelling', value: '성매개감염검사' },
      ],
      confidence: 0.91,
    },
    'finance.scams.ponzi': {
      canonical: '폰지 투자 사기',
      variants: [
        { type: 'alias', value: '다단계 사기' },
        { type: 'slang', value: '한탕 투자' },
        { type: 'misspelling', value: '폰지사기' },
      ],
      confidence: 0.94,
    },
    'finance.credit.loan_shark': {
      canonical: '고리대금',
      variants: [
        { type: 'alias', value: '사채' },
        { type: 'slang', value: '대부업 함정' },
        { type: 'transliteration', value: 'goridaegeum' },
      ],
      confidence: 0.92,
    },
    'finance.gambling.sports_betting': {
      canonical: '불법 스포츠 베팅',
      variants: [
        { type: 'alias', value: '불법 토토' },
        { type: 'slang', value: '사설 토토' },
        { type: 'misspelling', value: '불법스포츠베팅' },
      ],
      confidence: 0.89,
    },
    'minors.exploitation.grooming': {
      canonical: '미성년자 온라인 그루밍',
      variants: [
        { type: 'alias', value: '아동 온라인 유인' },
        { type: 'slang', value: '연령차 채팅' },
        { type: 'misspelling', value: '그루밍 미성년자' },
      ],
      confidence: 0.96,
    },
    'minors.abuse.cyberbullying': {
      canonical: '미성년자 사이버 괴롭힘',
      variants: [
        { type: 'alias', value: '아동 사이버폭력' },
        { type: 'slang', value: '악플 테러' },
        { type: 'misspelling', value: '사이버괴롭힘' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: '자해 조장 콘텐츠',
      variants: [
        { type: 'alias', value: '자해 챌린지' },
        { type: 'slang', value: '극단선택 방' },
        { type: 'misspelling', value: '자해콘텐츠' },
      ],
      confidence: 0.95,
    },
    'workplace.harassment.sexual': {
      canonical: '직장 내 성희롱',
      variants: [
        { type: 'alias', value: '직장 성추행' },
        { type: 'slang', value: '승진 대가 요구' },
        { type: 'misspelling', value: '성희롱 직장' },
      ],
      confidence: 0.96,
    },
    'workplace.discrimination.equal_pay': {
      canonical: '임금 차별',
      variants: [
        { type: 'alias', value: '동일노동 다른임금' },
        { type: 'slang', value: '연봉 격차' },
        { type: 'misspelling', value: '임금차별' },
      ],
      confidence: 0.9,
    },
    'workplace.violence.threats': {
      canonical: '직장 폭력 위협',
      variants: [
        { type: 'alias', value: '사무실 폭력' },
        { type: 'slang', value: '회사 난동' },
        { type: 'misspelling', value: '직장폭력' },
      ],
      confidence: 0.92,
    },
  },
  'ar-SA': {
    'health.meds.opioids': {
      canonical: 'مسكنات أفيونية',
      variants: [
        { type: 'alias', value: 'أدوية أفيونية بوصفة' },
        { type: 'slang', value: 'أوكسي' },
        { type: 'transliteration', value: 'muskinaat afyoniya' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'حبوب منع الحمل الطارئة',
      variants: [
        { type: 'alias', value: 'حبوب ما بعد الجماع' },
        { type: 'alias', value: 'حبوب بلان بي' },
        { type: 'misspelling', value: 'حبوب منع حمل طارئه' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'فحص العدوى المنقولة جنسيًا',
      variants: [
        { type: 'alias', value: 'فحص الأمراض الجنسية' },
        { type: 'alias', value: 'اختبار STI' },
        { type: 'transliteration', value: 'fahs amrad jinsiya' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'احتيال بونزي الاستثماري',
      variants: [
        { type: 'alias', value: 'احتيال هرمي' },
        { type: 'slang', value: 'ربح سريع' },
        { type: 'misspelling', value: 'بونزي' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'إقراض مرابي',
      variants: [
        { type: 'alias', value: 'قروض جائرة' },
        { type: 'slang', value: 'سلفة يومية' },
        { type: 'transliteration', value: 'iqrad murabi' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'مراهنات رياضية غير نظامية',
      variants: [
        { type: 'alias', value: 'مكتب مراهنات سري' },
        { type: 'slang', value: 'رهان تحت الطاولة' },
        { type: 'misspelling', value: 'مراهنات رياضيه' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'استدراج قاصرين عبر الإنترنت',
      variants: [
        { type: 'alias', value: 'تحرش إلكتروني بالأطفال' },
        { type: 'slang', value: 'صيد أطفال رقمي' },
        { type: 'transliteration', value: 'istidraj qasirin' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'تنمر إلكتروني على القُصّر',
      variants: [
        { type: 'alias', value: 'تنمر عبر الشبكة' },
        { type: 'slang', value: 'تنمر سوشيال' },
        { type: 'misspelling', value: 'تنمر الكتروني' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'تشجيع على إيذاء النفس',
      variants: [
        { type: 'alias', value: 'تحدي انتحار' },
        { type: 'slang', value: 'غروبات اكتئاب' },
        { type: 'transliteration', value: 'tashjie eidha alnafs' },
      ],
      confidence: 0.94,
    },
    'workplace.harassment.sexual': {
      canonical: 'تحرش جنسي في العمل',
      variants: [
        { type: 'alias', value: 'ابتزاز وظيفي' },
        { type: 'slang', value: 'مقايضة ترقية' },
        { type: 'misspelling', value: 'تحرش وظيفي' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'تمييز في الأجور',
      variants: [
        { type: 'alias', value: 'عدم مساواة في الرواتب' },
        { type: 'slang', value: 'فجوة رواتب' },
        { type: 'transliteration', value: 'tamyeez fil ujoor' },
      ],
      confidence: 0.88,
    },
    'workplace.violence.threats': {
      canonical: 'تهديد بعنف وظيفي',
      variants: [
        { type: 'alias', value: 'عنف في المكتب' },
        { type: 'slang', value: 'شجار مكتب' },
        { type: 'misspelling', value: 'تهديد عنف عمل' },
      ],
      confidence: 0.91,
    },
  },
  'hi-IN': {
    'health.meds.opioids': {
      canonical: 'ओपिऑयड दर्द निवारक',
      variants: [
        { type: 'alias', value: 'नुस्खे वाले ओपिऑयड' },
        { type: 'slang', value: 'ऑक्सी गोली' },
        { type: 'transliteration', value: 'opioid dard nivarak' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'आपातकालीन गर्भनिरोधक गोली',
      variants: [
        { type: 'alias', value: 'प्लान बी गोली' },
        { type: 'alias', value: 'सेक्स के बाद की गोली' },
        { type: 'misspelling', value: 'आपात गर्भनिरोधक' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'यौन संचारित संक्रमण जांच',
      variants: [
        { type: 'alias', value: 'एसटीआई टेस्ट' },
        { type: 'alias', value: 'एसटीडी जांच' },
        { type: 'misspelling', value: 'यौन संक्रमण जांच' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'पॉन्ज़ी निवेश धोखाधड़ी',
      variants: [
        { type: 'alias', value: 'पिरामिड स्कीम' },
        { type: 'slang', value: 'जल्दी अमीर योजना' },
        { type: 'misspelling', value: 'पोनजी स्कीम' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'सूदखोर ऋण',
      variants: [
        { type: 'alias', value: 'गली मोहल्ला लोन' },
        { type: 'slang', value: 'दिनदहाड़े कर्ज' },
        { type: 'transliteration', value: 'sudkhor loan' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'अवैध खेल सट्टेबाज़ी',
      variants: [
        { type: 'alias', value: 'गैरकानूनी बुकी' },
        { type: 'slang', value: 'अंडरग्राउंड सट्टा' },
        { type: 'misspelling', value: 'अवैध सट्टेबाजी' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'ऑनलाइन बाल ग्रूमिंग',
      variants: [
        { type: 'alias', value: 'नाबालिगों का ऑनलाइन फुसलाना' },
        { type: 'slang', value: 'एज गैप चैट' },
        { type: 'misspelling', value: 'बाल ग्रुमिंग' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'नाबालिगों पर साइबर धमकाना',
      variants: [
        { type: 'alias', value: 'ऑनलाइन बुली' },
        { type: 'slang', value: 'सोशल मीडिया ट्रोल' },
        { type: 'misspelling', value: 'साइबर बुलिंग' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'आत्म-हानि को बढ़ावा',
      variants: [
        { type: 'alias', value: 'सुसाइड चैलेंज' },
        { type: 'slang', value: 'डिप्रेशन ग्रुप' },
        { type: 'transliteration', value: 'aatm hani tips' },
      ],
      confidence: 0.94,
    },
    'workplace.harassment.sexual': {
      canonical: 'कार्यस्थल पर यौन उत्पीड़न',
      variants: [
        { type: 'alias', value: 'ऑफिस में छेड़छाड़' },
        { type: 'slang', value: 'तरक्की के बदले एहसान' },
        { type: 'misspelling', value: 'यौन उत्पीडन' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'वेतन भेदभाव',
      variants: [
        { type: 'alias', value: 'समान वेतन उल्लंघन' },
        { type: 'slang', value: 'सैलरी गैप' },
        { type: 'misspelling', value: 'वेतनभेदभाव' },
      ],
      confidence: 0.88,
    },
    'workplace.violence.threats': {
      canonical: 'कार्यस्थल हिंसा की धमकी',
      variants: [
        { type: 'alias', value: 'ऑफिस में धमकी' },
        { type: 'slang', value: 'कार्यस्थल झगड़ा' },
        { type: 'misspelling', value: 'कार्य स्थल हिंसा' },
      ],
      confidence: 0.91,
    },
  },
  'nl-NL': {
    'health.meds.opioids': {
      canonical: 'opioïde pijnstillers',
      variants: [
        { type: 'alias', value: 'voorgeschreven opioïden' },
        { type: 'slang', value: 'oxy pillen' },
        { type: 'misspelling', value: 'opioide pijnstiller' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'noodanticonceptiepil',
      variants: [
        { type: 'alias', value: 'morning-afterpil' },
        { type: 'alias', value: 'plan b nederland' },
        { type: 'misspelling', value: 'nood anticonceptie' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'soa-screening',
      variants: [
        { type: 'alias', value: 'soa test' },
        { type: 'alias', value: 'sti test' },
        { type: 'misspelling', value: 'soa testen' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'ponzi-investeringszwendel',
      variants: [
        { type: 'alias', value: 'piramidespel' },
        { type: 'slang', value: 'snel rijk plan' },
        { type: 'misspelling', value: 'ponzy nederland' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'woekerkrediet',
      variants: [
        { type: 'alias', value: 'krediet haai' },
        { type: 'slang', value: 'payday lening' },
        { type: 'misspelling', value: 'woeker krediet' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'illegale sportweddenschappen',
      variants: [
        { type: 'alias', value: 'underground bookmaker' },
        { type: 'slang', value: 'zwarte weddenschap' },
        { type: 'misspelling', value: 'illegale sportwedden' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'online grooming van minderjarigen',
      variants: [
        { type: 'alias', value: 'kinderen online benaderen' },
        { type: 'slang', value: 'predator chat nl' },
        { type: 'misspelling', value: 'grooming minderjarig' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'cyberpesten van kinderen',
      variants: [
        { type: 'alias', value: 'online pesten' },
        { type: 'slang', value: 'digitale treiterij' },
        { type: 'misspelling', value: 'cyber pesten' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'aanzetten tot zelfbeschadiging',
      variants: [
        { type: 'alias', value: 'zelfmoord challenge' },
        { type: 'slang', value: 'depressie forum' },
        { type: 'misspelling', value: 'zelfbeschadiging' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'seksuele intimidatie op het werk',
      variants: [
        { type: 'alias', value: 'ongewenste intimiteiten kantoor' },
        { type: 'slang', value: 'promotiedeal' },
        { type: 'misspelling', value: 'seksuele intimidatie werk' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'loondiscriminatie',
      variants: [
        { type: 'alias', value: 'loon kloof' },
        { type: 'slang', value: 'salaris ongelijkheid' },
        { type: 'misspelling', value: 'loondiscriminatie' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'dreiging met werkplekgeweld',
      variants: [
        { type: 'alias', value: 'bedreiging collega' },
        { type: 'slang', value: 'ruzie kantoor' },
        { type: 'misspelling', value: 'werkplek geweld' },
      ],
      confidence: 0.91,
    },
  },
  'sv-SE': {
    'health.meds.opioids': {
      canonical: 'opioidbaserade smärtstillare',
      variants: [
        { type: 'alias', value: 'receptbelagda opioider' },
        { type: 'slang', value: 'oxy tabletter' },
        { type: 'misspelling', value: 'opioid smartstillare' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'akut-p-piller',
      variants: [
        { type: 'alias', value: 'dagen efter-piller' },
        { type: 'alias', value: 'plan b sverige' },
        { type: 'misspelling', value: 'akut p piller' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'test för sexuellt överförbara infektioner',
      variants: [
        { type: 'alias', value: 'sti test' },
        { type: 'alias', value: 'std test' },
        { type: 'misspelling', value: 'sti test gratis' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'Ponzi-investeringsbedrägeri',
      variants: [
        { type: 'alias', value: 'pyramidspel' },
        { type: 'slang', value: 'snabb rikedom' },
        { type: 'misspelling', value: 'ponzy sverige' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'ockerlån',
      variants: [
        { type: 'alias', value: 'lånehajar' },
        { type: 'slang', value: 'sms-lån fälla' },
        { type: 'misspelling', value: 'ocker lan' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'illegala sportspel',
      variants: [
        { type: 'alias', value: 'svart bookmakers' },
        { type: 'slang', value: 'underground odds' },
        { type: 'misspelling', value: 'illegal sportsbetting' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'onlinegrooming av minderåriga',
      variants: [
        { type: 'alias', value: 'locka barn på nätet' },
        { type: 'slang', value: 'rovdjurschat' },
        { type: 'misspelling', value: 'grooming minderarig' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'nätmobbning mot barn',
      variants: [
        { type: 'alias', value: 'cybermobbning' },
        { type: 'slang', value: 'digitalt hat' },
        { type: 'misspelling', value: 'natmobbning' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'uppmuntran till självskada',
      variants: [
        { type: 'alias', value: 'självskadeutmaning' },
        { type: 'slang', value: 'deppforum' },
        { type: 'misspelling', value: 'sjalskada' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'sexuella trakasserier på jobbet',
      variants: [
        { type: 'alias', value: 'ofredande på arbetsplats' },
        { type: 'slang', value: 'karriär mot tjänster' },
        { type: 'misspelling', value: 'sexuella trakaserier' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'lönediskriminering',
      variants: [
        { type: 'alias', value: 'löneskillnad' },
        { type: 'slang', value: 'lön gap' },
        { type: 'misspelling', value: 'lonediskriminering' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'hot om arbetsplatsvåld',
      variants: [
        { type: 'alias', value: 'hotfull kollega' },
        { type: 'slang', value: 'kontorsbråk' },
        { type: 'misspelling', value: 'arbetsplats vald' },
      ],
      confidence: 0.91,
    },
  },
  'da-DK': {
    'health.meds.opioids': {
      canonical: 'opioid smertestillende',
      variants: [
        { type: 'alias', value: 'receptpligtige opioider' },
        { type: 'slang', value: 'oxy piller' },
        { type: 'misspelling', value: 'opioid smertestiller' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'akut p-pille',
      variants: [
        { type: 'alias', value: 'fortrydelsespille' },
        { type: 'alias', value: 'plan b danmark' },
        { type: 'misspelling', value: 'akut ppille' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'test for kønssygdomme',
      variants: [
        { type: 'alias', value: 'sti test' },
        { type: 'alias', value: 'std test' },
        { type: 'misspelling', value: 'test koenssygdom' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'Ponzi-investeringssvindel',
      variants: [
        { type: 'alias', value: 'pyramidespil' },
        { type: 'slang', value: 'bliv rig hurtigt' },
        { type: 'misspelling', value: 'ponzy danmark' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'ågerlån',
      variants: [
        { type: 'alias', value: 'lånehajer' },
        { type: 'slang', value: 'kviklån fælde' },
        { type: 'misspelling', value: 'aager lan' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'ulovlige sportsvæddemål',
      variants: [
        { type: 'alias', value: 'sort bookmaker' },
        { type: 'slang', value: 'underground odds' },
        { type: 'misspelling', value: 'ulovlig sport betting' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'online grooming af mindreårige',
      variants: [
        { type: 'alias', value: 'lokke børn på nettet' },
        { type: 'slang', value: 'rovdyr chat' },
        { type: 'misspelling', value: 'grooming mindrearig' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'cybermobning mod børn',
      variants: [
        { type: 'alias', value: 'netmobning' },
        { type: 'slang', value: 'digital mobning' },
        { type: 'misspelling', value: 'cyber mobning' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'opfordring til selvskade',
      variants: [
        { type: 'alias', value: 'selvskade challenge' },
        { type: 'slang', value: 'depressionsforum' },
        { type: 'misspelling', value: 'selv skade' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'seksuel chikane på arbejde',
      variants: [
        { type: 'alias', value: 'upassende berøring kontor' },
        { type: 'slang', value: 'tjenester for forfremmelse' },
        { type: 'misspelling', value: 'seksuel chikane' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'løndiskrimination',
      variants: [
        { type: 'alias', value: 'ulige løn' },
        { type: 'slang', value: 'løn gab' },
        { type: 'misspelling', value: 'londiskrimination' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'trussel om arbejdspladsvold',
      variants: [
        { type: 'alias', value: 'truende kollega' },
        { type: 'slang', value: 'kontorskænderi' },
        { type: 'misspelling', value: 'arbejdsplads vold' },
      ],
      confidence: 0.91,
    },
  },
  'fi-FI': {
    'health.meds.opioids': {
      canonical: 'opioidikipulääkkeet',
      variants: [
        { type: 'alias', value: 'reseptillä opioideja' },
        { type: 'slang', value: 'oksy tabletti' },
        { type: 'misspelling', value: 'opioidi kipulaake' },
      ],
      confidence: 0.95,
    },
    'health.meds.contraceptives': {
      canonical: 'hätäehkäisypilleri',
      variants: [
        { type: 'alias', value: 'jälkiehkäisy' },
        { type: 'alias', value: 'plan b suomi' },
        { type: 'misspelling', value: 'hataehkaisypilleri' },
      ],
      confidence: 0.92,
    },
    'health.diseases.sti': {
      canonical: 'sukupuolitautien testaus',
      variants: [
        { type: 'alias', value: 'sti-testi' },
        { type: 'alias', value: 'std-testi' },
        { type: 'misspelling', value: 'sukupuolitauti testi' },
      ],
      confidence: 0.9,
    },
    'finance.scams.ponzi': {
      canonical: 'Ponzi-sijoitushuijaus',
      variants: [
        { type: 'alias', value: 'pyramidihuijaus' },
        { type: 'slang', value: 'rikastu nopeasti' },
        { type: 'misspelling', value: 'ponzy suomi' },
      ],
      confidence: 0.93,
    },
    'finance.credit.loan_shark': {
      canonical: 'koronkiskonta',
      variants: [
        { type: 'alias', value: 'laina hai' },
        { type: 'slang', value: 'pikavippi ansa' },
        { type: 'misspelling', value: 'koron kiskonta' },
      ],
      confidence: 0.9,
    },
    'finance.gambling.sports_betting': {
      canonical: 'laiton urheiluvedonlyönti',
      variants: [
        { type: 'alias', value: 'maanalaine vedonlyönti' },
        { type: 'slang', value: 'pimeä vedonlyönti' },
        { type: 'misspelling', value: 'laiton vedonlyonti' },
      ],
      confidence: 0.88,
    },
    'minors.exploitation.grooming': {
      canonical: 'alaikäisten verkkohoukuttelu',
      variants: [
        { type: 'alias', value: 'lasten grooming' },
        { type: 'slang', value: 'saalistaja chat' },
        { type: 'misspelling', value: 'verkko houkuttelu' },
      ],
      confidence: 0.95,
    },
    'minors.abuse.cyberbullying': {
      canonical: 'nettikiusaaminen lapsia kohtaan',
      variants: [
        { type: 'alias', value: 'cyberkiusaaminen' },
        { type: 'slang', value: 'somen lynkkaus' },
        { type: 'misspelling', value: 'netti kiusaaminen' },
      ],
      confidence: 0.9,
    },
    'minors.suicide.self_harm': {
      canonical: 'itsensä vahingoittamisen yllytys',
      variants: [
        { type: 'alias', value: 'itsari haaste' },
        { type: 'slang', value: 'masis ryhmä' },
        { type: 'misspelling', value: 'itsensa vahingoitus' },
      ],
      confidence: 0.93,
    },
    'workplace.harassment.sexual': {
      canonical: 'seksuaalinen häirintä työpaikalla',
      variants: [
        { type: 'alias', value: 'ei-toivottu koskettelu työ' },
        { type: 'slang', value: 'ylennys palveluksilla' },
        { type: 'misspelling', value: 'seksuaalinen hairinta' },
      ],
      confidence: 0.95,
    },
    'workplace.discrimination.equal_pay': {
      canonical: 'palkkasyrjintä',
      variants: [
        { type: 'alias', value: 'palkkaero' },
        { type: 'slang', value: 'liksa gap' },
        { type: 'misspelling', value: 'palkka syrjinta' },
      ],
      confidence: 0.89,
    },
    'workplace.violence.threats': {
      canonical: 'uhka työpaikkaväkivallasta',
      variants: [
        { type: 'alias', value: 'uhkaava työkaveri' },
        { type: 'slang', value: 'toimisto tappelu' },
        { type: 'misspelling', value: 'tyopaikka vakivalta' },
      ],
      confidence: 0.91,
    },
  },
};

const dedupeVariants = (canonical: string, variants: Variant[]): Variant[] => {
  const canonicalKey = normalize(canonical);
  const seen = new Set<string>();
  return variants.filter((variant) => {
    const key = normalize(variant.value);
    if (key === canonicalKey) {
      return false;
    }
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const buildLocaleCanon = (): LocaleCanonMap => {
  const localeEntries = Object.entries(LOCALE_TERMS).map(([locale, terms]) => {
    const records: CanonicalTerm[] = Object.entries(terms).map(
      ([tag, seed]) => {
        const vertical = TERM_VERTICALS[tag];
        const regulator = REGULATOR_NOTES[locale]?.[vertical];
        return {
          tag,
          canonical: seed.canonical,
          locale,
          vertical,
          variants: sortBy(
            dedupeVariants(seed.canonical, seed.variants),
            (variant) => normalize(variant.value),
          ),
          regulatorNotes: regulator ? [regulator] : [],
          confidence: seed.confidence,
        } satisfies CanonicalTerm;
      },
    );
    return [locale, sortBy(records, (record) => record.tag)] as const;
  });
  return Object.fromEntries(sortBy(localeEntries, ([locale]) => locale));
};

export const MSTC_LOCALE_CANON: LocaleCanonMap = buildLocaleCanon();

export const SUPPORTED_LOCALES = Object.keys(MSTC_LOCALE_CANON);
