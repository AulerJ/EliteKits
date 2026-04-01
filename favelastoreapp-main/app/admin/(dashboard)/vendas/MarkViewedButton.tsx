"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";

type Props = {
  orderId: string;
  markViewedAction: (orderId: string) => Promise<void>;
};

export function MarkViewedButton({ orderId, markViewedAction }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await markViewedAction(orderId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
    >
      <Check className="h-4 w-4" />
      {isPending ? "..." : "Marcar como visto"}
    </button>
  );
}
