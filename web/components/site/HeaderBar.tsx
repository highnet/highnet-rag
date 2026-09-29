'use client';

import { type ReactNode, useEffect, useState } from 'react';

type HeaderBarProps = {
  children: ReactNode;
};

// Keeps the header on screen while the page scrolls, from md up (on phones the header wraps to
// two rows, too tall to keep over the reading). Its bottom rule only appears once the page has
// moved under it, so at the top of the page the header sits on the paper like before.
const HeaderBar = ({ children }: HeaderBarProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div
      data-slot="header-bar"
      data-scrolled={scrolled || undefined}
      className="z-30 border-b border-transparent bg-background transition-colors duration-150 data-scrolled:border-border md:sticky md:top-0"
    >
      {children}
    </div>
  );
};

export { HeaderBar };
