const KEY = 'swipe-brick-breaker-ranking';
const MAX_ENTRIES = 10;

export function loadRanking() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveScore(name, score) {
  const trimmed = (name || '').trim().slice(0, 12) || 'Player';
  const entry = {
    name: trimmed,
    score: Number(score) || 0,
    date: new Date().toISOString(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const list = loadRanking();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, MAX_ENTRIES);
  localStorage.setItem(KEY, JSON.stringify(top));
  return { entry, ranking: top };
}

export function clearRanking() {
  localStorage.removeItem(KEY);
}
