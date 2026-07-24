"use client";

import { useTransition } from "react";

export default function DeleteButton({
  action,
  confirmMessage = "Delete this? This cannot be undone.",
  label = "Delete",
  className = "text-xs text-red-500 hover:text-red-700 hover:underline",
}: {
  action: () => Promise<void> | void;
  confirmMessage?: string;
  label?: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={className}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(() => {
            action();
          });
        }
      }}
    >
      {isPending ? "Deleting…" : label}
    </button>
  );
}
