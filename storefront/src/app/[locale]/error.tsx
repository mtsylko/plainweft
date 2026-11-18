"use client";

import { buttonClass } from "@/components/button";
import { MessagePage } from "@/components/message-page";
import { useI18n } from "@/i18n/i18n-context";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const { error } = useI18n().dictionary;
  return (
    <MessagePage title={error.title} body={error.body}>
      <button type="button" onClick={retry} className={`${buttonClass()} px-6 py-3`}>
        {error.retry}
      </button>
    </MessagePage>
  );
}
