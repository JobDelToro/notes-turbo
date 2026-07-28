import type { CategoryMini } from '../categories/categories.service';

// Keyword hints for the four default categories (Random Thoughts is the catch-all).
export const KEYWORDS: Record<string, string[]> = {
  School: [
    'class', 'exam', 'homework', 'study', 'assignment', 'lecture', 'deadline',
    'school', 'teacher', 'course', 'professor', 'grade',
  ],
  Personal: [
    'book', 'read', 'gym', 'health', 'family', 'friend', 'travel', 'hobby',
    'recipe', 'personal', 'goal', 'budget', 'grocery',
  ],
  Drama: [
    'drama', 'fight', 'gossip', 'argument', 'breakup', 'conflict', 'angry',
    'annoyed', 'betrayed', 'jealous',
  ],
};

/** Pick the best-fitting category by keyword overlap; defaults to Random Thoughts. */
export function heuristicCategory(
  content: string,
  categories: CategoryMini[],
): CategoryMini | null {
  const text = (content || '').toLowerCase();
  let bestName = 'Random Thoughts';
  let bestScore = 0;
  for (const [name, keywords] of Object.entries(KEYWORDS)) {
    const score = keywords.reduce((n, kw) => (text.includes(kw) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestName = name;
      bestScore = score;
    }
  }
  return categories.find((c) => c.name === bestName) ?? categories[0] ?? null;
}
