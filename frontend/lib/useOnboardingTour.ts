'use client';

import { useCallback, useEffect } from 'react';
import type { DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

// Bump the version to re-show the tour after a meaningful UX change.
const SEEN_KEY = 'notes:onboarded:v1';

/**
 * Build the tour steps at call time so we can (a) target the New-Note control
 * that's actually visible at this breakpoint, and (b) skip any step whose anchor
 * isn't mounted — driver.js throws on a missing element, so we filter defensively.
 */
function buildSteps(): DriveStep[] {
  const isDesktop = window.matchMedia('(min-width: 640px)').matches;
  const newNoteSelector = isDesktop ? '[data-tour="new-note"]' : '[data-tour="new-note-fab"]';

  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to Notes 👋',
        description:
          'A 20-second tour so you feel right at home. You can replay it anytime from the “?” button.',
      },
    },
    {
      element: '[data-tour="categories"]',
      popover: {
        title: 'Color-coded categories',
        description:
          'Your notes live in categories. Tap one to filter — the number shows how many notes are inside.',
        side: isDesktop ? 'right' : 'bottom',
        align: 'start',
      },
    },
    {
      element: newNoteSelector,
      popover: {
        title: 'Create a note',
        description:
          'Start a new note here, then just type — it autosaves as you go, no Save button.',
        side: isDesktop ? 'left' : 'top',
        align: 'end',
      },
    },
    {
      popover: {
        title: '✨ Let the AI do the busywork',
        description:
          'Open any note and the AI can file it under the right category and summarize it for you — and it still helps via a keyword fallback even without an API key.',
      },
    },
    {
      popover: {
        title: "You're all set 🎉",
        description: 'That’s the whole app. Happy note-taking!',
      },
    },
  ];

  return steps.filter((step) => !step.element || document.querySelector(step.element as string));
}

/**
 * Guided onboarding. Auto-runs once for a brand-new user (gated on localStorage)
 * and exposes `start()` so a header control can replay it on demand. driver.js is
 * dynamically imported so it never ships in the SSR/first-paint bundle.
 *
 * @param ready pass `true` only once the UI it points at has mounted.
 */
export function useOnboardingTour(ready: boolean) {
  const start = useCallback(async () => {
    const { driver } = await import('driver.js');
    driver({
      showProgress: true,
      popoverClass: 'notes-tour',
      overlayColor: 'rgba(15, 15, 25, 0.55)',
      stagePadding: 6,
      stageRadius: 14,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Got it',
      steps: buildSteps(),
    }).drive();
  }, []);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    if (localStorage.getItem(SEEN_KEY)) return;
    // Let the layout settle (and entrance animations finish) before pointing.
    const timer = window.setTimeout(() => {
      localStorage.setItem(SEEN_KEY, '1');
      void start();
    }, 850);
    return () => window.clearTimeout(timer);
  }, [ready, start]);

  return { start };
}
