// Placeholder for franc-min since installation failed in monorepo environment
// Implementing the simple heuristic logic provided in the scaffold

// import franc from 'franc-min';

export function detectLang(text:string){
  // Simple heuristic or mock since franc-min is not available
  // In real usage, this would be: const code = franc(text || '');
  // For now, we default to 'eng' unless we see specific keywords
  const lower = (text || '').toLowerCase();
  let code = 'eng';
  if (lower.includes('hola') || lower.includes('qué') || lower.includes('evidencia')) code = 'spa';
  else if (lower.includes('bonjour') || lower.includes('pourquoi') || lower.includes('preuve')) code = 'fra';

  return (['eng','spa','fra'].includes(code) ? code : 'eng');
}

export function templateFor(code:string){ return { eng:'T_EN', spa:'T_ES', fra:'T_FR' }[code]; }
