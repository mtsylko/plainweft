/**
 * Which view a catalogue picture shows, as "back" in tee-black-back.png. The seed names files
 * <handle>-<colour>-<view>. Alt text is translated and file names are not, so the name is what
 * tells the views apart.
 */
export function viewOf(url: string): string | undefined {
  return /-([a-z]+)\.\w+$/.exec(new URL(url).pathname)?.[1];
}

/**
 * The first two pictures of one view, topped up with the first pictures of the other views when there
 * are fewer. Undefined when there aren't two pictures at all.
 */
export function pickPair<I extends { url: string }>(
  images: readonly I[],
  view: string,
): readonly [I, I] | undefined {
  const ofView = images.filter((image) => viewOf(image.url) === view);
  // The others only top up: a picture of the view never comes twice.
  const [first, second] = [...ofView, ...images.filter((image) => !ofView.includes(image))];
  return first && second ? [first, second] : undefined;
}
