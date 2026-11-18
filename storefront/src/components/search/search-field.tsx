"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { buttonClass } from "@/components/button";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { useI18n } from "@/i18n/i18n-context";
import {
  cleanTerms,
  defaultBrowse,
  MAX_TERMS_LENGTH,
  searchFor,
  TERMS,
} from "@/lib/product/browse";

/** How long typing has to pause before the results follow it. */
const SETTLE_MS = 300;

interface SearchFieldProps {
  /** The search page, without its query. */
  path: string;
}

/**
 * The search box. It is a plain GET form, so it works before JavaScript loads. After that, the
 * results follow as the shopper types, and the form sets `data-pending` so the page can dim the old
 * ones until the new ones arrive.
 */
export function SearchField({ path }: SearchFieldProps) {
  return (
    // The terms are in the query, which only the browser knows on a prerendered page.
    <Suspense fallback={<SearchForm path={path} terms="" />}>
      <SearchFormWithQuery path={path} />
    </Suspense>
  );
}

function SearchFormWithQuery({ path }: SearchFieldProps) {
  const terms = cleanTerms(useSearchParams().get(TERMS) ?? "");
  return <SearchForm path={path} terms={terms} />;
}

function SearchForm({ path, terms }: SearchFieldProps & { terms: string }) {
  const router = useRouter();
  const words = useI18n().dictionary.search;
  const [value, setValue] = useState(terms);
  const [pending, startTransition] = useTransition();
  // The last terms this box asked for, and the last ones the URL had.
  const [sent, setSent] = useState(terms);
  const [seen, setSeen] = useState(terms);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);

  // A link can change the terms too: a suggestion, or the header's Search. Terms this box sent
  // itself leave it alone, as the shopper may have typed on since.
  if (seen !== terms) {
    setSeen(terms);
    if (terms !== sent) {
      setSent(terms);
      setValue(terms);
    }
  }

  // A search still waiting to go is dropped when the shopper leaves the page.
  useEffect(() => () => clearTimeout(timer.current), []);

  function search(raw: string) {
    clearTimeout(timer.current);
    const next = cleanTerms(raw);
    if (next === sent) return;
    setSent(next);
    startTransition(() => {
      // New terms start without filters, which might leave nothing of them. The history entry is
      // replaced: a pause in typing isn't a page to go back to.
      router.replace(`${path}${searchFor(defaultBrowse("search", next))}`, { scroll: false });
    });
  }

  function change(raw: string) {
    setValue(raw);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(raw), SETTLE_MS);
  }

  function clear() {
    // The button goes with the text, so focus moves to the box first, ready for the next search.
    input.current?.focus();
    setValue("");
    search("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(value);
  }

  return (
    <form
      action={path}
      role="search"
      onSubmit={submit}
      data-pending={pending ? "" : undefined}
      className="flex gap-2"
    >
      <div className="flex h-14 min-w-0 flex-1 bg-surface has-[input:focus-visible]:focus-ring">
        {/* No right padding: the text never reaches the edge, as the clear button comes with it. */}
        <label className="flex min-w-0 flex-1 cursor-text items-center gap-3 pl-4">
          <SearchIcon className="size-5 shrink-0" />
          <span className="sr-only">{words.label}</span>
          <input
            ref={input}
            type="search"
            name={TERMS}
            value={value}
            onChange={(event) => change(event.currentTarget.value)}
            maxLength={MAX_TERMS_LENGTH}
            autoComplete="off"
            enterKeyHint="search"
            // Someone who opens an empty search page came to type.
            autoFocus={!terms}
            // The browser's own clear button is a small cross that can't be resized, so the box
            // draws its own below.
            className="w-full min-w-0 bg-transparent text-lead focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
        </label>
        {value && (
          // Outside the label, so its name doesn't become part of the box's.
          <button
            type="button"
            aria-label={words.clear}
            onClick={clear}
            className="grid w-14 shrink-0 place-items-center transition-colors hover:bg-stone"
          >
            <CloseIcon className="size-6" />
          </button>
        )}
      </div>
      <button type="submit" className={`${buttonClass()} h-14 px-5`}>
        {words.submit}
      </button>
    </form>
  );
}
