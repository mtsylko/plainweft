import type { ReactNode } from "react";

interface IconProps {
  /** The size and place: icons take the text colour and have no size of their own. */
  className?: string;
}

/**
 * A line icon in the text's colour. It is hidden from screen readers: the control around it carries
 * the words.
 */
function Icon({
  viewBox,
  strokeWidth = 2,
  className,
  children,
}: IconProps & { viewBox: string; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    >
      {children}
    </svg>
  );
}

/** A magnifying glass, for search. */
export function SearchIcon({ className }: IconProps) {
  return (
    <Icon viewBox="0 0 24 24" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </Icon>
  );
}

/** A cross, for clearing a field. */
export function CloseIcon({ className }: IconProps) {
  return (
    <Icon viewBox="0 0 24 24" className={className}>
      <path d="m5 5 14 14M19 5 5 19" />
    </Icon>
  );
}

/** An arrow pointing down, for a select. */
export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Icon viewBox="0 0 16 16" className={className}>
      <path d="m3 6 5 5 5-5" />
    </Icon>
  );
}

/** An arrow up and to the right, for a link that leads on. */
export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <Icon viewBox="0 0 48 48" strokeWidth={4} className={className}>
      <path d="M10 38 38 10M16 10h22v22" />
    </Icon>
  );
}
