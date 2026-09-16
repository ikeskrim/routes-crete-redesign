import { Plate } from "@/components/ui/Plate";
import styles from "@/components/sections/Positioning.module.css";
import { cn } from "@/lib/utils";

export interface StackedPanel {
  /** The credit under the statement (`site.whyUs[].title`). */
  eyebrow: string;
  /** The pull quote (`site.whyUs[].statement`). */
  statement: string;
  /** An operator photograph (graded path), decoration beside its statement. */
  image?: string;
}

/**
 * The why-us rows (C+ SPEC §D.4): three pull quotes that hold still beside
 * photographs bleeding alternately left and right. Server component.
 *
 * Kept as `section#why-us[data-stacked]` nested in `#positioning` (the stacked
 * scene's anchor and attribute contracts), on bone stock. Each row is an
 * `article.ed-grid` as tall as its plate; at ≥1024 the statement column is
 * sticky, so the words hold while the photograph scrolls past. Sticky is
 * layout, not motion: the rows hold under reduced motion too.
 *
 *   row 1  plate bleeds left (4:5), statement on columns 8–12
 *   row 2  plate bleeds right (3:2, the landscape source is never cropped to
 *          portrait), statement larger on columns 1–5, hung from the plate foot
 *   row 3  inset portrait on columns 2–5, statement on columns 7–11
 *
 * Phones: plate, then rule, statement, credit; nothing sticky.
 *
 * The photographs are operator frames: `alt=""`, no caption, lazy, unclipped
 * once from their bleed edge. All three titles stay in the text (arc-guard).
 * The layout lives with the movement it belongs to (Positioning.module.css).
 *
 * Retired (§G.2): the pinned crossfade, the drift and counter-parallax, the
 * rail and the active-panel state. No client code remains.
 */
export function StackedPanels({
  panels,
  id,
  className,
}: {
  panels: StackedPanel[];
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} data-stacked="" className={cn("bone-stock", styles.whyUs, className)}>
      <div aria-hidden="true" className="bone-stock-layer" />

      {panels.map((panel, i) => {
        const landscape = i === 1;
        return (
          <article key={panel.eyebrow} className={cn("ed-grid", styles.whyRow)}>
            {panel.image && (
              <Plate
                src={panel.image}
                alt=""
                ratio={landscape ? "3 / 2" : "4 / 5"}
                sizes={
                  landscape
                    ? "(min-width: 1024px) 57vw, 100vw"
                    : "(min-width: 1024px) 42vw, 100vw"
                }
                /* the unclip opens from the bleed edge; the inset row 3 from the left */
                bleed={landscape ? "right" : i === 0 ? "left" : undefined}
                unclip
                className={styles.whyPlate}
                imgClassName={i === 0 ? styles.cropGrove : undefined}
              />
            )}
            <div className={styles.whyText}>
              <span aria-hidden="true" className={styles.quoteRule} />
              <p className={cn("text-pullquote", styles.whyStatement)}>{panel.statement}</p>
              <p className={cn("text-caption", styles.whyCredit)}>{panel.eyebrow}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
