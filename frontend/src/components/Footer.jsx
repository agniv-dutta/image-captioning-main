import React from 'react';
import { Link } from 'react-scroll';
import { BrandMark } from './Brand';

const navItems = [
  { to: 'home', label: 'Home' },
  { to: 'model', label: 'Model' },
  { to: 'about', label: 'About' },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-night">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={22} />
            <span className="text-sm font-semibold text-ink">Image Captioning</span>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                smooth
                duration={400}
                offset={-90}
                className="text-sm text-muted transition-colors hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 border-t border-line pt-6 sm:flex-row sm:justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
            CNN · LSTM · React · Flask
          </p>
          <p className="text-xs text-muted">© {year} Image Captioning</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;