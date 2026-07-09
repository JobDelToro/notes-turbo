/**
 * Minimal className combiner — joins truthy class fragments with a space.
 * Kept dependency-free; we don't need full clsx/tailwind-merge semantics here.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
