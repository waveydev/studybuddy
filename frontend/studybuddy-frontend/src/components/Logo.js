import React from 'react';

// StudyBuddy mark: an open book with a spark of insight rising from the spine.
// Colors come from CSS tokens so it follows light/dark themes.
export const LogoMark = ({ size = 32 }) => (
  <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" className="logo-tile" />
    <path
      className="logo-page"
      d="M5.5 12.2c3.3-1.5 6.6-1.3 9.6.8v11.6c-3-1.9-6.3-2.1-9.6-.8z"
    />
    <path
      className="logo-page logo-page-right"
      d="M26.5 12.2c-3.3-1.5-6.6-1.3-9.6.8v11.6c3-1.9 6.3-2.1 9.6-.8z"
    />
    <path
      className="logo-spark"
      d="M16 3.6l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"
    />
  </svg>
);

const Logo = () => (
  <span className="logo">
    <LogoMark />
    <span className="logo-word">
      Study<span className="logo-word-accent">Buddy</span>
    </span>
  </span>
);

export default Logo;
