// Plain-language meaning of what the Alerts page shows, so anyone can tell
// what an alert means for them and what to do about it.

export type Severity = 'Danger' | 'Warning' | 'Info' | 'Safe';

export const SEVERITY_GUIDE: Record<Severity, { meaning: string; action: string }> = {
  Danger: {
    meaning: 'A threat to life or property in the area right now.',
    action: 'Act now: move to safety and follow official instructions.',
  },
  Warning: {
    meaning: 'Something dangerous may happen soon.',
    action: 'Get ready: keep your phone charged and know where you would go.',
  },
  Info: {
    meaning: 'Useful information, no immediate danger.',
    action: 'Stay informed. No action needed now.',
  },
  Safe: {
    meaning: 'The danger has passed.',
    action: 'All clear. Stay careful near damaged areas.',
  },
};

export function severityGuide(severity: string) {
  return SEVERITY_GUIDE[severity as Severity] ?? SEVERITY_GUIDE.Info;
}

// What a magnitude usually means for people near it.
export function quakeMeaning(magnitude: number): string {
  if (magnitude >= 7) return 'Major quake. Serious damage is likely over a wide area.';
  if (magnitude >= 6) return 'Strong quake. Can cause serious damage near the centre.';
  if (magnitude >= 5) return 'Moderate quake. Can damage weak buildings nearby.';
  if (magnitude >= 4) return 'Light quake. Widely felt, damage is rare.';
  return 'Minor quake. Often not felt, no damage expected.';
}
