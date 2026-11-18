import type { ChangeEvent } from "react";
import { ChevronDownIcon } from "./icons";
import styles from "./select.module.css";

/** One choice in a `Select`. */
export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  /** The words above the field. */
  label: string;
  name: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  /** Where the field sits in its parent's layout. */
  className?: string;
}

/**
 * A select in the store's style: a flat field with an arrow of our own, and an opened list of our
 * own where the browser lets CSS draw it.
 */
export function Select({ label, name, value, options, onChange, className }: SelectProps) {
  return (
    <label className={className}>
      <span className="mb-3 block">{label}</span>
      <span className="relative grid">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`${styles.select} peer col-start-1 row-start-1 h-12 w-full rounded-none bg-surface pr-11 pl-4 transition-colors hover:bg-stone`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/*
          A select with a list of our own is only as wide as its chosen label. Hidden copies of every
          label keep it as wide as the longest, as a native one is, so it doesn't jump between options.
        */}
        {options.map((option) => (
          <span
            key={option.value}
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 h-0 overflow-hidden pr-11 pl-4"
          >
            {option.label}
          </span>
        ))}
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 transition-transform peer-open:rotate-180 motion-reduce:transition-none" />
      </span>
    </label>
  );
}
