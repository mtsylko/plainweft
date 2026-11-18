/** The store's filled buttons, by what they sit on and what they do. */
const TONES = {
  /** Most actions. Ground text on the teal would be 4.1:1, so the hover takes the accent's ink too. */
  ink: "bg-ink text-ground hover:bg-accent hover:text-accent-ink",
  /** The steps toward paying: add to bag and check out. */
  accent: "bg-accent text-accent-ink hover:bg-accent-strong",
  /** On an ink panel, as in the hero. */
  ground: "bg-ground text-ink hover:bg-ecru",
} as const;

/**
 * The look of a filled button, for a `<button>`, a `<Link>` or an `<a>` alike. The caller adds the
 * size and the place, which differ with where the button sits.
 */
export function buttonClass(tone: keyof typeof TONES = "ink"): string {
  return `${TONES[tone]} font-medium transition-colors active:scale-[0.98]`;
}
