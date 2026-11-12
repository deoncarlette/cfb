import { SEASON } from '@/config.js';

export function HeroHeader() {
  return (
    <div className="hero">
      <p className="hero-eyebrow">{SEASON} college football</p>
      <h1 className="hero-title">Make every Saturday count.</h1>
      <p className="hero-desc">Choose every winner. Rank every game. When the first whistle blows, the board goes public.</p>
    </div>
  );
}
