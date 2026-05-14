import Image from "next/image";
import { cn } from "@/lib/utils";

type CadenceMarkProps = {
  className?: string;
};

export function CadenceMark({ className }: CadenceMarkProps) {
  return (
    <span aria-hidden="true" className={cn("relative inline-flex size-8 shrink-0", className)}>
      <Image
        src="/logo.svg"
        alt=""
        fill
        sizes="(max-width: 768px) 32px, 32px"
        className="object-contain"
      />
    </span>
  );
}