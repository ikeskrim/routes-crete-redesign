"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import type { GalleryImage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Masonry gallery with a lightbox.
 *
 * CSS columns keep the masonry free of layout JS; every image keeps its true
 * aspect ratio so nothing shifts as they load.
 */
export function Gallery({
  images,
  blurMap,
}: {
  images: (GalleryImage & { alt: string })[];
  blurMap: Record<string, string>;
}) {
  const reduced = useReducedMotionSafe();
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpen((current) =>
        current === null
          ? null
          : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  const current = open === null ? null : images[open];

  return (
    <>
      <div className="columns-2 gap-3 sm:gap-4 lg:columns-3 xl:columns-4">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`View image ${i + 1} of ${images.length}`}
            className="group mb-3 block w-full overflow-hidden rounded-media bg-rock-200 sm:mb-4"
          >
            <span className="relative block">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 24vw"
                placeholder={blurMap[image.src] ? "blur" : undefined}
                blurDataURL={blurMap[image.src]}
                className="h-auto w-full transition-transform duration-[1.1s] ease-luxe group-hover:scale-[1.06]"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-ocean-950/0 transition-colors duration-700 group-hover:bg-ocean-950/25"
              />
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {current && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60] flex flex-col bg-ocean-950/97 backdrop-blur-sm"
            onClick={close}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <span className="text-eyebrow uppercase text-sand-200/60 tabular-nums">
                {String((open ?? 0) + 1).padStart(2, "0")} /{" "}
                {String(images.length).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={close}
                className="text-eyebrow uppercase text-sand-100 hover:text-gold-300"
              >
                Close
              </button>
            </div>

            <div
              className="relative flex flex-1 items-center justify-center px-4 pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                key={current.src}
                initial={reduced ? false : { opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full w-full"
              >
                <Image
                  src={current.src}
                  alt={current.alt}
                  fill
                  sizes="100vw"
                  quality={75}
                  placeholder={blurMap[current.src] ? "blur" : undefined}
                  blurDataURL={blurMap[current.src]}
                  className="object-contain"
                />
              </motion.div>

              {[-1, 1].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => step(delta)}
                  aria-label={delta < 0 ? "Previous image" : "Next image"}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 px-5 py-8 text-sand-100/70 transition-colors hover:text-gold-300",
                    delta < 0 ? "left-0" : "right-0",
                  )}
                >
                  <span aria-hidden className="text-2xl">
                    {delta < 0 ? "←" : "→"}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
