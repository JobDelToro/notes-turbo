/** DRF-style page envelope. The frontend reads `results`; `next`/`previous`
 * are provided for contract-completeness. */
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 200;

export function buildPage<T>(
  results: T[],
  count: number,
  page: number,
  pageSize: number,
  path: string,
  extraQuery = '',
): Page<T> {
  const link = (p: number): string => `${path}?page=${p}${extraQuery}`;
  return {
    count,
    next: page * pageSize < count ? link(page + 1) : null,
    previous: page > 1 ? link(page - 1) : null,
    results,
  };
}
