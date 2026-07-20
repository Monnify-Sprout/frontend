import { clsx, type ClassValue } from 'clsx';
import type { KeyboardEvent } from 'react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Makes a whole table row behave like a control: click anywhere activates, and
// Enter/Space do too for keyboard + screen-reader users. Spread onto a <tr> that
// carries `cursor-pointer` and a focus-visible style. Shared so every clickable
// table row behaves identically.
export function rowActivate(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
