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
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, fontSize: 30 }}>
        <span style={{ fontWeight: 700 }}>{COPY.siteName}</span>
        <span style={{ color: muted, fontSize: 24 }}>{COPY.tagline}</span>
      </div>
      <div
        style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.08, maxWidth: 980 }}
      >
        {COPY.hero.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 21 }}>
        {STAGE_ORDER.map((stage, i) => (
          <div
            key={stage}
            style={{
              display: 'flex',
              gap: 8,
              padding: '6px 12px',
              border: `1px solid ${rule}`,
              borderRadius: 3,
              background: raised,
            }}
          >
            <span style={{ color: muted }}>{String(i + 1).padStart(2, '0')}</span>
            <span>{STAGES[stage].title}</span>
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '6px 12px',
            border: `1px solid ${ink}`,
            borderRadius: 3,
            fontWeight: 700,
          }}
        >
          <span style={{ color: pencil }}>=</span>
          <span>{COPY.diagram.answer}</span>
        </div>
      </div>
    </div>,
    size,
  );
};
