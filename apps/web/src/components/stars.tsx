import { Star } from "lucide-react";

interface Props {
  value: number;       // 0-5
  size?: number;       // px
  className?: string;
}

export function Stars({ value, size = 16, className = "" }: Props) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= value ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-muted-foreground/30"}
        />
      ))}
    </span>
  );
}
