import React, { useState } from 'react';
import { Link } from 'react-scroll';
import { BrandMark } from './Brand';

const navItems = [
  { to: 'home', label: 'Home' },
  { to: 'model', label: 'Model' },
  { to: 'about', label: 'About' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto w-full max-w-6xl px-4 pt-3">
        <nav
          aria-label="Primary"
          className="flex h-14 items-center justify-between rounded-2xl border border-line bg-surface/85 px-5 shadow-card backdrop-blur-md"
        >
          <a
            href="#home"
            className="flex items-center gap-2.5"
            onClick={() => setOpen(false)}
          >
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              Image Captioning
            </span>
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                spy
                smooth
                duration={400}
                offset={-90}
                activeClass="text-accent after:scale-x-100"
                className="nav-link"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:border-accent/50 hover:text-accent md:hidden"
          >
            {open ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </nav>

        {open && (
          <div className="mt-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-card backdrop-blur-md md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                spy
                smooth
                duration={400}
                offset={-90}
                activeClass="text-accent"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;