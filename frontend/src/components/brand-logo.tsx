import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "wordmark" | "mark";
  className?: string;
  priority?: boolean;
};

const brandAssets = {
  wordmark: {
    src: "/brand/complif.svg",
    alt: "Complif",
    width: 686,
    height: 186,
    sizes: "(max-width: 768px) 120px, 140px",
    className: "h-8 w-auto",
  },
  mark: {
    src: "/brand/complif-c.jpg",
    alt: "Complif logo",
    width: 900,
    height: 900,
    sizes: "40px",
    className: "size-10 object-cover",
  },
} as const;

export function BrandLogo({
  variant = "wordmark",
  className,
  priority = false,
}: BrandLogoProps) {
  const asset = brandAssets[variant];

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      sizes={asset.sizes}
      priority={priority}
      className={cn(asset.className, className)}
    />
  );
}
