import type { TeamMember } from "@/lib/types";
import { InlineText } from "@/components/ui/RichText";
import { ImageReveal } from "@/components/ui/Cinematic";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import { getBlur } from "@/lib/content";

export function Team({
  heading,
  subheading,
  intro,
  members,
}: {
  heading: string;
  subheading: string;
  intro: string;
  members: TeamMember[];
}) {
  return (
    <section
      id="team"
      aria-labelledby="team-heading"
      className="sand bg-shell py-section-lg text-ink"
    >
      <div aria-hidden className="sand-wash" />
      <div aria-hidden className="sand-overlay" />
      <div className="relative mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-gold-600/60" />
          <p className="text-eyebrow uppercase text-rock-500">{subheading}</p>
        </div>

        <SplitLines
          as="h2"
          text={heading}
          className="text-display-lg mt-6 max-w-[14ch] text-ink"
        />

        <Reveal delay={0.1}>
          <p className="text-body-lg mt-8 max-w-[46rem] text-rock-600">
            <InlineText text={intro} />
          </p>
        </Reveal>

        <ul className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-3 lg:mt-24">
          {members.map((member, i) => (
            <li key={member.key}>
              <ImageReveal
                src={member.photo}
                alt={member.name}
                blurDataURL={getBlur(member.photo)}
                sizes="(max-width: 640px) 100vw, 30vw"
                ratio="aspect-[4/5]"
                delay={i * 0.08}
                className="bg-rock-200"
              />
              <Reveal delay={0.1 + i * 0.08}>
                <h3 className="text-heading-md mt-6 text-ink">{member.name}</h3>
                <p className="text-caption mt-1 uppercase tracking-[0.16em] text-rock-500">
                  {member.role}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
