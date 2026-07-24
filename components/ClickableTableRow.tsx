"use client";

import { useRouter } from "next/navigation";

export default function ClickableTableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <tr onDoubleClick={() => router.push(href)} className={className}>
      {children}
    </tr>
  );
}
