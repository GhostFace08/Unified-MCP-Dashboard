import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link to="/" className="text-lg font-semibold tracking-tight text-foreground">
          Lovable App
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Home
          </Link>
          <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            About
          </a>
        </nav>

        <div className="hidden md:block">
          <a
            href="#about"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </a>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              Home
            </Link>
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              Features
            </a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              About
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
