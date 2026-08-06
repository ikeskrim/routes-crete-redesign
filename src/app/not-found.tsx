import Link from "next/link";
import Image from "next/image";

import { getBlur } from "@/lib/content";

/** The strongest frame we have at its native size — no upscaling. */
const IMAGE = "/images/experiences/kourtaliotis-temple-of-nature/ku953-dsc05531.jpg";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  const blurDataURL = getBlur(IMAGE);

  return (
    <section className="grain relative flex min-h-[100svh] items-end overflow-hidden bg-ocean-950 text-sand-50">
      <div className="absolute inset-0">
        <Image
          src={IMAGE}
          alt=""
          fill
          priority
          quality={70}
          sizes="100vw"
          placeholder={blurDataURL ? "blur" : undefined}
          blurDataURL={blurDataURL}
          className="object-cover"
        />
      </div>

      <div aria-hidden className="scrim absolute inset-0" />
      <div aria-hidden className="grain-overlay" />

      <div className="relative mx-auto w-full max-w-[92rem] px-6 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-gold-400/70" />
          <p className="text-eyebrow uppercase text-gold-300">404</p>
        </div>

        <h1 className="text-display-xl mt-6 max-w-[16ch] text-sand-50">
          This path doesn&rsquo;t lead anywhere
        </h1>

        <p className="text-body-lg mt-6 max-w-[42ch] text-sand-100/80">
          The page you were looking for isn&rsquo;t here. The island still is.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-14 items-center rounded-pill bg-sand-50 px-8 font-display text-eyebrow uppercase text-ocean-950 transition-colors duration-500 hover:bg-white"
          >
            Back home
          </Link>
          <Link
            href="/experiences"
            className="inline-flex h-14 items-center rounded-pill border border-sand-100/30 px-8 font-display text-eyebrow uppercase text-sand-50 transition-colors duration-500 hover:border-sand-100/70"
          >
            Explore experiences
          </Link>
        </div>
      </div>
    </section>
  );
}
