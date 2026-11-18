import type { ReactNode } from "react";

interface MessagePageProps {
  title: string;
  body: string;
  /** The one way on: a button or a link. */
  children: ReactNode;
}

/** A page that only says what went wrong and offers a way on: the 404 and the error page. */
export function MessagePage({ title, body, children }: MessagePageProps) {
  return (
    <section className="grid min-h-[60svh] content-center justify-items-start gap-6 px-gutter">
      <h1 className="text-head font-medium">{title}</h1>
      <p className="max-w-[40ch]">{body}</p>
      {children}
    </section>
  );
}
