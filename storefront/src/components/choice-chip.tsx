import type { ComponentProps, ReactNode } from "react";

interface ChoiceChipProps extends Omit<ComponentProps<"input">, "type" | "className" | "children"> {
  type: "checkbox" | "radio";
  /** What the chip shows, which is also the input's name for screen readers. */
  children: ReactNode;
  /**
   * Can still be chosen, but leads to nothing in stock, as a sold-out size. It keeps its field on
   * hover: grey on stone would fall below 4.5:1.
   */
  crossedOut?: boolean;
  /**
   * The chip's layout and padding, which differ with what it holds, and any look of its own for a
   * disabled input. A filter greys out a value that would leave nothing; the product page's options
   * are only disabled while the page loads, and look the same then.
   */
  className: string;
}

/**
 * A checkbox or a radio drawn as a flat chip that turns ink when chosen. The input stays in the page,
 * only hidden, so the form sends it and screen readers and keyboards use it as they would any other.
 */
export function ChoiceChip({ children, crossedOut = false, className, ...input }: ChoiceChipProps) {
  return (
    <label className="cursor-pointer has-disabled:cursor-auto">
      <input {...input} className="peer sr-only" />
      {/*
        On hover, only a chip that is neither chosen nor crossed out lights up. A chosen one stays ink:
        stone under its ground text would fall below 4.5:1.
      */}
      <span
        className={`h-12 bg-surface transition-colors peer-checked:bg-ink peer-checked:text-ground peer-focus-visible:focus-ring ${crossedOut ? "text-muted line-through" : "peer-enabled:peer-not-checked:hover:bg-stone"} ${className}`}
      >
        {children}
      </span>
    </label>
  );
}
