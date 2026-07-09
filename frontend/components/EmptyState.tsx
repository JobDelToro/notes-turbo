import { BobaCup } from './illustrations/BobaCup';

/**
 * Shown in the main area when there are no notes (either overall or for the
 * active category filter). Centered boba-tea illustration + a friendly line.
 */
export function EmptyState({
  message = "I'm just here waiting for your charming notes...",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {/* TODO: swap real Figma asset */}
      <BobaCup className="mb-6 h-[200px] w-[160px]" />
      <p className="max-w-sm font-serif text-xl text-ink/70">{message}</p>
    </div>
  );
}
