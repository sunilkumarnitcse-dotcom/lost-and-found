// Possible-match scoring (SRS FR-12).
// A match is a SUGGESTION ONLY — never proof of ownership. A claim
// still needs staff to review the evidence (FR-10).
//
// Score (out of 100):
//   same category            +40
//   same location (exact)    +25, same location word +10
//   shared keyword in title/description +5 each (max +20)
//   dates within 3 days      +15, within 7 days +5
function scoreMatch(a, b) {
  let score = 0;
  const reasons = [];

  if (a.category && a.category === b.category) {
    score += 40;
    reasons.push('same category');
  }

  const locA = (a.location || '').toLowerCase();
  const locB = (b.location || '').toLowerCase();
  if (locA && locA === locB) {
    score += 25;
    reasons.push('same location');
  } else if (locA && locB) {
    const wordsA = locA.split(/[^a-z0-9]+/).filter(Boolean);
    if (wordsA.some((w) => w.length > 2 && locB.includes(w))) {
      score += 10;
      reasons.push('similar location');
    }
  }

  const words = (text) => String(text || '').toLowerCase()
    .split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const setA = new Set([...words(a.title), ...words(a.description)]);
  const setB = new Set([...words(b.title), ...words(b.description)]);
  const common = [...setA].filter((w) => setB.has(w));
  if (common.length > 0) {
    score += Math.min(20, common.length * 5);
    reasons.push(`shared keywords: ${common.slice(0, 3).join(', ')}`);
  }

  if (a.date && b.date) {
    const days = Math.abs(new Date(a.date) - new Date(b.date)) / (1000 * 60 * 60 * 24);
    if (days <= 3) { score += 15; reasons.push('dates close together'); }
    else if (days <= 7) { score += 5; reasons.push('dates within a week'); }
  }

  return { score: Math.min(100, score), reasons };
}

/** Find possible matches for one item among opposite-type items. */
function findPossibleMatches(item, candidates) {
  return candidates
    .filter((c) => String(c._id) !== String(item._id) && c.type !== item.type)
    .map((c) => {
      const { score, reasons } = scoreMatch(item, c);
      return { item: c, score, reasons };
    })
    .filter((m) => m.score >= 40)
    .sort((x, y) => y.score - x.score)
    .slice(0, 10);
}

module.exports = { scoreMatch, findPossibleMatches };
