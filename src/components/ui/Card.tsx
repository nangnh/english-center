import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-bubble bg-white p-5 shadow-md ${className}`}
      {...props}
    />
  );
}
