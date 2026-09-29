import { readFileSync } from 'node:fs';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import { COPY } from '@/content/copy';
import { STAGE_ORDER, STAGES } from '@/content/stages';

export const dynamic = 'force-static';
const size = { width: 1200, height: 630 };

// The share card is drawn at build time, so it reads the light pad's colours straight from
// globals.css (the single home of the design tokens) instead of repeating them here.
const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');
// Recursive's static instances (the card renderer cannot read variable fonts): the prose voice
// and the data voice (MONO 1), at 400 and 700. SIL Open Font License, see assets/fonts/OFL.txt.
const font = (file: string) => readFileSync(path.join(process.cwd(), 'assets/fonts', file));
const FONTS = [
  { name: 'Recursive', data: font('recursive-sans-400.ttf'), weight: 400 as const },
  { name: 'Recursive', data: font('recursive-sans-700.ttf'), weight: 700 as const },
  { name: 'Recursive Mono', data: font('recursive-mono-400.ttf'), weight: 400 as const },
  { name: 'Recursive Mono', data: font('recursive-mono-700.ttf'), weight: 700 as const },
].map((f) => ({ ...f, style: 'normal' as const }));
const MONO = 'Recursive Mono';
const token = (name: string): string =>
  css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))![1];

// The share card (/og.png): the site's name, the hero's headline and the real pipeline steps.
export const GET = () => {
  const [paper, raised, rule, ink, muted, pencil] = [
    'paper',
    'paper-raised',
    'rule',
    'graphite',
    'graphite-muted',
    'blue-pencil',
  ].map(token);
  const chevron = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
  const box = { display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 12px' };
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: paper,
        color: ink,
        fontFamily: 'Recursive',
      }}
    >
      <div style={{ display: 'flex', fontFamily: MONO, fontWeight: 700, fontSize: 30 }}>
        {COPY.siteName}
      </div>
      <div
        style={{ display: 'flex', fontSize: 62, fontWeight: 700, lineHeight: 1.06, maxWidth: 1056 }}
      >
        {COPY.hero.title}
      </div>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 21 }}
      >
        {STAGE_ORDER.map((stage, i) => (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && chevron}
            <div
              style={{ ...box, border: `1px solid ${rule}`, borderRadius: 3, background: raised }}
            >
              <span style={{ fontFamily: MONO, color: muted, fontSize: 19 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{STAGES[stage].title}</span>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {chevron}
          <div
            style={{
              ...box,
              alignItems: 'center',
              border: `1px solid ${ink}`,
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={pencil}
              strokeWidth="2.5"
            >
              <path d="M5 9h14M5 15h14" />
            </svg>
            <span>{COPY.diagram.answer}</span>
          </div>
        </div>
      </div>
    </div>,
    { ...size, fonts: FONTS },
  );
};
