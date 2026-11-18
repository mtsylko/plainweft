import type { ReactNode } from "react";

interface PageIntroProps {
  /** Labels the section around the intro, through `aria-labelledby`. */
  id: string;
  title: ReactNode;
  lead: ReactNode;
  /**
   * A section further down a page: an h2 that rises in on scroll, with a lead in body text. Without
   * it, the page's own h1 enters with the page, and its lead is set larger.
   */
  section?: boolean;
  /** The space below, which depends on what follows. */
  className?: string;
}

/**
 * A title with its lead beside it. The lead starts where the tile grid's third column does, and its
 * capitals start level with the title's, so a longer lead grows downwards instead of rising above
 * the title.
 */
export function PageIntro({ id, title, lead, section = false, className = "" }: PageIntroProps) {
  const Heading = section ? "h2" : "h1";
  return (
    <div className={`grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-2 ${className}`}>
      <Heading
        id={id}
        className={`${section ? "rise" : "enter"} text-head font-medium lg:col-span-6 lg:trim-cap`}
      >
        {title}
      </Heading>
      <p
        className={`${section ? "rise" : "enter text-lead [--enter-step:1]"} max-w-[40ch] text-pretty lg:col-span-6 lg:col-start-7 lg:trim-cap`}
      >
        {lead}
      </p>
    </div>
  );
}
