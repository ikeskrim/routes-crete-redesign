/**
 * Capture preflight.
 *
 * A dead or stale server once returned zero screenshots while the run still
 * "succeeded"; worse, a server left over from an older build could serve stale
 * pages that look like verification. Every capture set therefore asserts the
 * target is alive first, and is stamped with the commit it rendered.
 *
 * It also runs the file-based source rules (below) before anything else:
 *   P1   `grain` never with `fixed` / `absolute`                 always on
 *   P7   paper/bone stock paired with its layer, never fixed    always on
 *   P8   gold only on the pill; the pill the only rounded control      S9
 *   P9   colour literals only in the edition files                    S9
 *   P10  no legacy colour scale utilities                             S9
 *   P11  every colour utility resolves to a defined --color-* token   S9
 *   P12  edition values declared only in the edition files; the
 *        grade-D coupling of the plate tokens                         S9
 *   P13  no faux small caps / synthesis, no filter or blend on a
 *        photograph, no clip or opacity gate in the hero, no hidden
 *        overflow over a sticky child, emphasis words that exist,
 *        texture strengths within the measured legibility floor      S9
 *   P14  a committed env file is only .env.production, holding only
 *        the cutover switch at the canonical origin          always on
 * (C+ SPEC §I.2.) P8–P13 cannot pass before the rollout, so they are switched
 * on at the S9 integration by qa/cplus-stage.mts, the one switch every C+
 * assertion reads.
 *
 *   node qa/preflight.mts      the source rules alone, without a server
 */
import { execFileSync, execSync } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type * as TS from "typescript";

import { cplusS9, cplusS9Line } from "./cplus-stage.mts";

export interface BuildStamp {
  commit: string;
  dirty: boolean;
  base: string;
  capturedAt: string;
}

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * `@utility grain { position: relative }` is emitted into the same utilities
 * layer as Tailwind's position utilities, at equal specificity — and AFTER
 * `.absolute` and `.fixed`:
 *
 *     .absolute{position:absolute}.fixed{position:fixed}.grain,.relative{position:relative}
 *
 * so `grain fixed` silently resolves to position: relative. That shipped: the
 * "fullscreen" overlay menu was an in-flow block that added its own height to
 * the document, left 243px of the page visible below it at 390x844, and threw
 * away the reader's scroll position whenever it took focus. Nothing about the
 * class list looks wrong, which is why this is a build-time guard rather than
 * a comment. `.sticky` is emitted after `.grain` and is therefore safe.
 */
async function assertNoGrainPositionClash(): Promise<void> {
  const roots = ["src"];
  const offenders: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (/\.(tsx|ts)$/.test(entry.name)) {
        const source = await fs.readFile(full, "utf8");
        /* Blank out comments before scanning, preserving newlines so line
           numbers still point at the real thing. Without this the guard fires
           on the comment *explaining* the guard — prose that quotes both the
           emitted CSS and the offending pairing. */
        const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
          m.replace(/[^\n]/g, " "),
        );
        code.split("\n").forEach((line, i) => {
          for (const [, classes] of line.matchAll(/["'`]([^"'`]*\bgrain\b[^"'`]*)["'`]/g)) {
            if (/\bgrain\b/.test(classes) && /\b(fixed|absolute)\b/.test(classes)) {
              offenders.push(`${full}:${i + 1}  ${classes.trim()}`);
            }
          }
        });
      }
    }
  };

  await Promise.all(roots.map(walk));

  if (offenders.length) {
    throw new Error(
      `PREFLIGHT FAILED: \`grain\` combined with \`fixed\`/\`absolute\`.\n` +
        `\`.grain\` sets position: relative and wins over both, so the element ` +
        `will NOT be positioned as written.\n` +
        `Put the grain on an inner element instead (grain-overlay paints it):\n` +
        offenders.map((o) => `  ${o}`).join("\n"),
    );
  }
}

/**
 * P7 — stock texture pairing (C+ SPEC §F.1, §F.3, §I.2).
 *
 * `paper-stock` / `bone-stock` only make a section a positioned, isolated
 * ground: the grain, mottle and vignette are painted by the
 * `paper-stock-layer` / `bone-stock-layer` child. A section class without its
 * layer ships a flat, untextured ground that nothing else would notice, so the
 * pairing is checked per component file: a file whose class strings name a
 * stock must also name that stock's layer.
 *
 * The layer is `position: absolute` inside its section. Written together with
 * `fixed` it would be the P1 bug over again (a utility emitted later at equal
 * specificity silently deciding the position) and, if it won, a full-viewport
 * multiply layer over photographs, so that pairing fails too.
 *
 * How it reads a file:
 * - Comments are blanked first, as in P1, so prose about the rule never trips
 *   it; newlines are kept, so line numbers stay true. A `//` right after `:`
 *   is a URL inside a string (`"https://…"`), not a comment, and is kept.
 * - The class names are distinctive, so a use or a layer is any whole-token
 *   occurrence in the remaining code (a string, a template literal spanning
 *   lines, a `cn()` argument), not only a quoted string on one line.
 * - The class string checked for `fixed` is the literal enclosing the layer
 *   class: from the nearest quote before it to the same quote after it, which
 *   also covers a multi-line template literal.
 */
export async function assertStockTexturePairing(roots: string[] = ["src"]): Promise<void> {
  const offenders: string[] = [];
  const lineAt = (text: string, index: number) => text.slice(0, index).split("\n").length;

  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (/\.(tsx|ts)$/.test(entry.name)) {
        const source = await fs.readFile(full, "utf8");
        const code = source.replace(/\/\*[\s\S]*?\*\/|(?<!:)\/\/[^\n]*/g, (m) =>
          m.replace(/[^\n]/g, " "),
        );
        for (const stock of ["paper", "bone"] as const) {
          const uses = [...code.matchAll(new RegExp(`(?<![\\w-])${stock}-stock(?![\\w-])`, "g"))].map(
            (m) => lineAt(code, m.index),
          );
          const layers = [...code.matchAll(new RegExp(`(?<![\\w-])${stock}-stock-layer(?![\\w-])`, "g"))];

          for (const m of layers) {
            const before = code.slice(0, m.index);
            const open = Math.max(before.lastIndexOf('"'), before.lastIndexOf("'"), before.lastIndexOf("`"));
            const quote = open >= 0 ? code[open] : "";
            const close = quote ? code.indexOf(quote, m.index) : -1;
            const classes = open >= 0 && close > open ? code.slice(open + 1, close) : code.slice(m.index);
            if (/(?<![\w-])fixed(?![\w-])/.test(classes)) {
              offenders.push(
                `${full}:${lineAt(code, m.index)}  \`${stock}-stock-layer\` with \`fixed\`: ${classes.replace(/\s+/g, " ").trim()}`,
              );
            }
          }

          if (uses.length && !layers.length) {
            offenders.push(
              `${full}:${uses.join(",")}  \`${stock}-stock\` without a \`${stock}-stock-layer\` child in the same component`,
            );
          }
        }
      }
    }
  };

  await Promise.all(roots.map(walk));

  if (offenders.length) {
    throw new Error(
      `PREFLIGHT FAILED (P7): stock texture pairing.\n` +
        `A \`paper-stock\`/\`bone-stock\` section paints its texture only through its ` +
        `first child <div aria-hidden className="paper-stock-layer" /> (or bone-stock-layer), ` +
        `and that layer is absolute, never fixed:\n` +
        offenders.map((o) => `  ${o}`).join("\n"),
    );
  }
}

/* ==========================================================================
   C+ SOURCE RULES P8–P13 (SPEC §I.2), switched on at S9.

   Shared reading of the tree:
   - every .ts, .tsx and .css file under src/;
   - TypeScript and TSX are parsed with the TypeScript compiler (a
     devDependency), so comments never count, JSX structure is real (which
     element contains which) and string literals are told apart from copy;
   - CSS is read by a small tokenizer that knows comments, strings, url()
     and nesting, and records every declaration with the chain of selectors
     and at-rules it sits in.
   Every finding prints as `  P<n>  <file>:<line>  <what>`, and a failing
   rule throws `PREFLIGHT FAILED (P<n>): …` with all of its findings.
   ========================================================================== */

type Ts = typeof TS;
let tsModule: Ts | undefined;
async function loadTs(): Promise<Ts> {
  if (!tsModule) {
    const mod = (await import("typescript")) as unknown as { default?: Ts } & Ts;
    tsModule = mod.default ?? mod;
  }
  return tsModule;
}

interface SourceFile {
  /** Repo-relative, forward slashes. */
  rel: string;
  text: string;
  kind: "ts" | "css";
}

const posix = (p: string) => p.split(path.sep).join("/");

async function readSources(root = "src"): Promise<SourceFile[]> {
  const out: SourceFile[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(tsx?|css)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        out.push({
          rel: posix(full),
          text: await fs.readFile(full, "utf8"),
          kind: entry.name.endsWith(".css") ? "css" : "ts",
        });
      }
    }
  };
  await walk(root);
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

/* ---- allowlist helpers (each use carries its own comment) --------------- */

const EDITION_CSS = "src/app/edition.css";
const EDITION_TS = "src/lib/edition.ts";
const GLOBALS_CSS = "src/app/globals.css";
const BUTTON_TSX = "src/components/ui/Button.tsx";
const PLATE_CSS = "src/components/ui/Plate.module.css";

/* ---- CSS ----------------------------------------------------------------- */

interface CssDecl {
  /** Property, or `@apply` / `@import` for a statement at-rule. */
  prop: string;
  value: string;
  line: number;
  /** Enclosing preludes, outermost first (`@media …`, `.a`, `&::before`). */
  context: string[];
}

const cssCache = new Map<string, CssDecl[]>();

function parseCss(file: SourceFile): CssDecl[] {
  const cached = cssCache.get(file.rel);
  if (cached) return cached;
  const src = file.text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (offset: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const out: CssDecl[] = [];
  const stack: string[] = [];
  let buf = "";
  let bufStart = 0;
  let quote: string | null = null;
  let paren = 0;

  const flush = () => {
    const raw = buf;
    const start = bufStart;
    buf = "";
    const trimmed = raw.trim();
    if (!trimmed) return;
    const line = lineOf(start + raw.search(/\S/));
    if (trimmed.startsWith("@")) {
      const m = trimmed.match(/^@([\w-]+)\s*([\s\S]*)$/);
      if (m) out.push({ prop: `@${m[1]}`, value: m[2].trim(), line, context: [...stack] });
      return;
    }
    const colon = trimmed.indexOf(":");
    if (colon < 0) return;
    out.push({
      prop: trimmed.slice(0, colon).trim(),
      value: trimmed.slice(colon + 1).trim().replace(/\s+/g, " "),
      line,
      context: [...stack],
    });
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (!buf.length) bufStart = i;
    if (quote) {
      buf += c;
      if (c === "\\") buf += src[++i] ?? "";
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      buf += c;
      continue;
    }
    if (c === "(") paren++;
    if (c === ")") paren = Math.max(0, paren - 1);
    if (paren === 0 && c === "{") {
      stack.push(buf.trim().replace(/\s+/g, " "));
      buf = "";
      continue;
    }
    if (paren === 0 && c === ";") {
      flush();
      continue;
    }
    if (paren === 0 && c === "}") {
      flush();
      stack.pop();
      continue;
    }
    buf += c;
  }
  flush();
  cssCache.set(file.rel, out);
  return out;
}

/** Split on a separator at bracket depth 0. */
function splitTop(s: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of s) {
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
    if (c === sep && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** The resolved selector a declaration applies to (`@utility x` → `.x`). */
function declSelector(d: CssDecl): string {
  let sel = "";
  for (const p of d.context) {
    if (p.startsWith("@utility")) {
      sel = `.${p.slice("@utility".length).trim()}`;
      continue;
    }
    if (p.startsWith("@")) continue;
    if (!sel) sel = p;
    else if (p.includes("&")) sel = p.replace(/&/g, sel);
    else sel = splitTop(p, ",").map((q) => `${sel} ${q}`).join(", ");
  }
  return sel;
}

const inAtRule = (d: CssDecl, name: string) =>
  d.context.some((p) => p === `@${name}` || p.startsWith(`@${name} `));

/** The last compound of each selector in a list (what the rule styles). */
function subjects(selector: string): string[] {
  return splitTop(selector, ",").map((s) => {
    const parts: string[] = [];
    let depth = 0;
    let cur = "";
    for (const c of s) {
      if (c === "(" || c === "[") depth++;
      if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
      if (depth === 0 && /[\s>+~]/.test(c)) {
        if (cur) parts.push(cur);
        cur = "";
      } else cur += c;
    }
    if (cur) parts.push(cur);
    return parts[parts.length - 1] ?? "";
  });
}

const classIn = (compound: string, name: string) =>
  new RegExp(`\\.${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`).test(compound);

/** Declarations whose rule styles `.name` (in any selector of the list). */
const declsForClass = (decls: CssDecl[], name: string) =>
  decls.filter((d) => d.prop && !d.prop.startsWith("@") && subjects(declSelector(d)).some((s) => classIn(s, name)));

/* ---- TypeScript / TSX ----------------------------------------------------- */

interface StringPiece {
  text: string;
  line: number;
  /** Written where a class list is written (className, cn(), a *Class const)
      or shaped like one. */
  classLike: boolean;
}

interface JsxEl {
  tag: string;
  line: number;
  node: TS.JsxOpeningElement | TS.JsxSelfClosingElement;
  /** The JsxElement (with children) or the self-closing element itself. */
  whole: TS.Node;
}

interface TsInfo {
  file: SourceFile;
  sf: TS.SourceFile;
  strings: StringPiece[];
  jsx: JsxEl[];
  /** Local name of a default-imported CSS module → its file and declarations. */
  styleModules: Map<string, { rel: string; decls: CssDecl[] }>;
  /** Variable declarations (name, line). */
  declared: { name: string; line: number }[];
  /** Style-object keys that are custom properties (`"--ed-x": …`). */
  customPropKeys: { name: string; line: number }[];
}

const CLASS_TOKEN = /^[!a-z0-9@*[(-](?:[^\s[\]A-Z]|\[[^\]]*\])*$/;
const CLASS_CALLEES = /^(cn|clsx|cx|cva|twMerge|twJoin|ctaClass)$/;

function looksLikeClassList(text: string): boolean {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => CLASS_TOKEN.test(t)) && tokens.some((t) => /[-:]/.test(t));
}

async function analyseTs(file: SourceFile, byRel: Map<string, SourceFile>): Promise<TsInfo> {
  const ts = await loadTs();
  const sf = ts.createSourceFile(
    file.rel,
    file.text,
    ts.ScriptTarget.Latest,
    true,
    file.rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const lineOf = (n: TS.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  /* Is this string written where a class list is written?
     "class": a class attribute, a cn()-style call, a *class* variable or key;
     "not":   another JSX attribute, or the value of a non-class object key
              (a style object's `boxSizing: "border-box"`);
     "unknown": anything else, decided by shape, and then only for strings of
              two or more tokens (a lone "text-rendering" in a list of CSS
              property names is not a class). */
  const classContext = (n: TS.Node): "class" | "not" | "unknown" => {
    const verdict: "not" | "unknown" =
      ts.isPropertyAssignment(n.parent) && n.parent.initializer === n && !/class/i.test(n.parent.name.getText(sf))
        ? "not"
        : "unknown";
    for (let p = n.parent; p; p = p.parent) {
      if (ts.isJsxAttribute(p)) return /class/i.test(p.name.getText(sf)) ? "class" : "not";
      if (ts.isCallExpression(p) && CLASS_CALLEES.test(p.expression.getText(sf))) return "class";
      if (
        (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) &&
        /class/i.test(p.name.getText(sf))
      ) {
        return "class";
      }
      if (ts.isBlock(p) || ts.isSourceFile(p) || ts.isJsxElement(p)) break;
    }
    return verdict;
  };
  const isClassLike = (n: TS.Node, text: string) => {
    const verdict = classContext(n);
    if (verdict !== "unknown") return verdict === "class";
    return text.trim().split(/\s+/).length >= 2 && looksLikeClassList(text);
  };

  const info: TsInfo = { file, sf, strings: [], jsx: [], styleModules: new Map(), declared: [], customPropKeys: [] };

  const visit = (n: TS.Node) => {
    if (ts.isImportDeclaration(n)) {
      const spec = (n.moduleSpecifier as TS.StringLiteral).text;
      const local = n.importClause?.name?.getText(sf);
      if (local && /\.module\.css$/.test(spec)) {
        const target = spec.startsWith("@/")
          ? `src/${spec.slice(2)}`
          : posix(path.join(path.dirname(file.rel), spec));
        const css = byRel.get(target);
        info.styleModules.set(local, { rel: target, decls: css ? parseCss(css) : [] });
      }
      return; // module specifiers are not strings the page uses
    }
    if (ts.isExportDeclaration(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      const text = (n as TS.LiteralLikeNode).text;
      if (text.trim()) {
        info.strings.push({ text, line: lineOf(n), classLike: isClassLike(n, text) });
      }
    }
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      info.jsx.push({
        tag: n.tagName.getText(sf),
        line: lineOf(n),
        node: n,
        whole: ts.isJsxOpeningElement(n) ? n.parent : n,
      });
    }
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) {
      info.declared.push({ name: n.name.text, line: lineOf(n) });
    }
    if (ts.isPropertyAssignment(n) && (ts.isStringLiteral(n.name) || ts.isNoSubstitutionTemplateLiteral(n.name)) && n.name.text.startsWith("--")) {
      info.customPropKeys.push({ name: n.name.text, line: lineOf(n) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return info;
}

/* JSX helpers ------------------------------------------------------------- */

function jsxAttr(ts: Ts, sf: TS.SourceFile, el: JsxEl, name: string): TS.JsxAttribute | undefined {
  for (const p of el.node.attributes.properties) {
    if (ts.isJsxAttribute(p) && p.name.getText(sf) === name) return p;
  }
  return undefined;
}

/** Every string piece inside an attribute's initializer. */
function initStrings(ts: Ts, attr: TS.JsxAttribute | undefined): string[] {
  if (!attr?.initializer) return [];
  const out: string[] = [];
  const visit = (n: TS.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      out.push((n as TS.LiteralLikeNode).text);
    }
    ts.forEachChild(n, visit);
  };
  visit(attr.initializer);
  return out;
}

/** `styles.x` / `styles["x"]` references inside an attribute's initializer. */
function initModuleClasses(ts: Ts, info: TsInfo, attr: TS.JsxAttribute | undefined): { module: string; name: string }[] {
  if (!attr?.initializer) return [];
  const out: { module: string; name: string }[] = [];
  const visit = (n: TS.Node) => {
    if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && info.styleModules.has(n.expression.text)) {
      out.push({ module: n.expression.text, name: n.name.text });
    }
    if (
      ts.isElementAccessExpression(n) &&
      ts.isIdentifier(n.expression) &&
      info.styleModules.has(n.expression.text) &&
      ts.isStringLiteral(n.argumentExpression)
    ) {
      out.push({ module: n.expression.text, name: n.argumentExpression.text });
    }
    ts.forEachChild(n, visit);
  };
  visit(attr.initializer);
  return out;
}

const CLASS_ATTRS = ["className", "class", "imgClassName", "frameClassName"];

function classTokens(ts: Ts, info: TsInfo, el: JsxEl): string[] {
  return CLASS_ATTRS.flatMap((a) => initStrings(ts, jsxAttr(ts, info.sf, el, a)))
    .flatMap((s) => s.split(/\s+/))
    .filter(Boolean);
}

function moduleDecls(ts: Ts, info: TsInfo, el: JsxEl): { name: string; rel: string; decls: CssDecl[] }[] {
  return CLASS_ATTRS.flatMap((a) => initModuleClasses(ts, info, jsxAttr(ts, info.sf, el, a))).map((m) => {
    const mod = info.styleModules.get(m.module);
    return { name: m.name, rel: mod?.rel ?? "", decls: declsForClass(mod?.decls ?? [], m.name) };
  });
}

/** `style={{ … }}` as property name → literal text (or the expression text). */
function styleProps(ts: Ts, info: TsInfo, el: JsxEl): Map<string, string> {
  const out = new Map<string, string>();
  const attr = jsxAttr(ts, info.sf, el, "style");
  const expr = attr?.initializer && ts.isJsxExpression(attr.initializer) ? attr.initializer.expression : undefined;
  if (!expr) return out;
  const visit = (n: TS.Node) => {
    if (ts.isObjectLiteralExpression(n)) {
      for (const p of n.properties) {
        if (ts.isPropertyAssignment(p)) {
          const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : p.name.getText(info.sf);
          const v = p.initializer;
          out.set(
            key,
            ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)
              ? v.text
              : ts.isNumericLiteral(v)
                ? v.text
                : v.getText(info.sf),
          );
        }
      }
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(expr);
  return out;
}

/** JSX elements strictly inside `el` (same file). */
function jsxDescendants(ts: Ts, info: TsInfo, el: JsxEl): JsxEl[] {
  if (!ts.isJsxElement(el.whole)) return [];
  const start = el.whole.getStart(info.sf);
  const end = el.whole.getEnd();
  return info.jsx.filter((d) => d !== el && d.node.getStart(info.sf) > start && d.node.getEnd() <= end);
}

/** Variants off: `lg:hover:!sticky` → `sticky`. */
const baseUtility = (token: string) => token.replace(/^(?:(?:\[[^\]]*\]|[^:[\s])*:)*/, "").replace(/^!|!$/g, "");

/* ---- the Tailwind theme (P9, P11) ------------------------------------------ */

interface ThemeNames {
  appColours: Set<string>;
  defaultColours: Set<string>;
  textSteps: Set<string>;
  textUtilities: Set<string>;
}

function readTheme(files: SourceFile[]): ThemeNames {
  const appColours = new Set<string>();
  const textSteps = new Set<string>();
  const textUtilities = new Set<string>();
  let reset = false;
  for (const f of files.filter((x) => x.kind === "css")) {
    for (const d of parseCss(f)) {
      if (inAtRule(d, "theme")) {
        let m = d.prop.match(/^--color-([\w-]+)$/);
        if (m) appColours.add(m[1]);
        if (/^--color-\*$/.test(d.prop) && d.value === "initial") reset = true;
        m = d.prop.match(/^--text-([\w-]+)$/);
        if (m && !m[1].includes("--")) textSteps.add(m[1]);
      }
    }
    for (const m of f.text.matchAll(/@utility\s+text-([\w-]+)/g)) textUtilities.add(m[1]);
  }
  const defaultColours = new Set<string>();
  const themeCss = path.join("node_modules", "tailwindcss", "theme.css");
  if (fsSync.existsSync(themeCss)) {
    const text = fsSync.readFileSync(themeCss, "utf8");
    for (const m of text.matchAll(/^\s*--color-([a-z]+(?:-\d+)?)\s*:/gm)) defaultColours.add(m[1]);
    for (const m of text.matchAll(/^\s*--text-([a-z0-9]+)\s*:/gm)) textSteps.add(m[1]);
  }
  return { appColours, defaultColours: reset ? new Set() : defaultColours, textSteps, textUtilities };
}

const COLOUR_KEYWORDS = new Set(["transparent", "current", "inherit", "initial", "unset"]);

/* Utilities of these five prefixes whose suffix is not a colour. */
const NON_COLOUR: Record<string, RegExp> = {
  text: /^(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|shadow(-.*)?)$/,
  bg: /^(fixed|local|scroll|clip-.*|origin-.*|(left|right|top|bottom|center)(-(left|right|top|bottom))?|repeat(-.*)?|no-repeat|space|round|auto|cover|contain|none|linear-.*|radial(-.*)?|conic(-.*)?|gradient-.*|blend-.*|size-.*|position-.*)$/,
  border: /^(\d+(\.\d+)?|solid|dashed|dotted|double|hidden|none|collapse|separate|spacing(-.*)?|[xytrblse](-\d+(\.\d+)?)?)$/,
  borderSide: /^(\d+(\.\d+)?)$/,
  fill: /^none$/,
  stroke: /^(\d+(\.\d+)?|none)$/,
};

const COLOUR_UTILITY =
  /^!?(bg|text|border-[xytrblse]|border|fill|stroke)-([a-z][a-z0-9-]*?)(?:\/(?:\d+(?:\.\d+)?|\[[^\]]+\]|\([^)]+\)))?!?$/;

/** A colour utility's colour name, or null when the token is not one. */
function colourOf(token: string, theme: ThemeNames): string | null {
  const m = baseUtility(token).match(COLOUR_UTILITY);
  if (!m) return null;
  const [, prefix, suffix] = m;
  if (prefix === "text") {
    if (NON_COLOUR.text.test(suffix) || theme.textSteps.has(suffix) || theme.textUtilities.has(suffix)) return null;
  } else if (prefix === "bg") {
    if (NON_COLOUR.bg.test(suffix)) return null;
  } else if (prefix === "border") {
    if (NON_COLOUR.border.test(suffix)) return null;
  } else if (prefix.startsWith("border-")) {
    if (NON_COLOUR.borderSide.test(suffix)) return null;
  } else if (NON_COLOUR[prefix]?.test(suffix)) {
    return null;
  }
  return suffix;
}

/* ---- the edition values (P12, P13) ----------------------------------------- */

function editionGrade(byRel: Map<string, SourceFile>): string | null {
  const text = byRel.get(EDITION_TS)?.text ?? "";
  const letters = [...text.matchAll(/^[ \t]*(?:export[ \t]+)?const[ \t]+GRADE\b[^=\n]*=[ \t]*["']([a-z])["']/gm)].map((m) => m[1]);
  return letters.length === 1 ? letters[0] : null;
}

/* ---- rule plumbing ------------------------------------------------------- */

interface Finding {
  rule: string;
  where: string;
  what: string;
}

interface RuleContext {
  ts: Ts;
  files: SourceFile[];
  byRel: Map<string, SourceFile>;
  infos: TsInfo[];
  theme: ThemeNames;
  notes: string[];
}

const at = (rel: string, line: number) => `${rel}:${line}`;

function ruleError(rule: string, title: string, findings: Finding[]): Error {
  return new Error(
    `PREFLIGHT FAILED (${rule}): ${title}\n` +
      findings.map((f) => `  ${f.rule}  ${f.where}  ${f.what}`).join("\n"),
  );
}

/* P8 ---------------------------------------------------------------------- */

const CTA_UTILITY =
  /^!?(?:bg|text|border(?:-[xytrblse])?|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|shadow|accent|caret|divide|placeholder)-(?:cta|on-cta|cta-hover|cta-edge)(?:\/[\w.[\]()-]+)?!?$/;
const ROUND_UTILITY = /^!?rounded(?:-(?:[trblse]|tl|tr|br|bl|ss|se|es|ee))?-(?:cta|pill|full|\[(?:50%|9{3,}px)\])!?$/;
const CTA_REF = /--ed-cta-|--color-(?:on-)?cta(?:-hover|-edge)?(?![\w-])|--radius-(?:cta|pill)(?![\w-])/;
const PILL_RADIUS = /(?<![\w.])9{3,}px|calc\(\s*infinity/;

/* P8 allowlist, commented per SPEC §I.2:
   - src/components/ui/Button.tsx: the one place the gold pill is drawn.
   - rounded-pill / rounded-full in LocationsMap.tsx and RouteJourney.tsx:
     data marks (map markers, route stops), the only other round shapes.
   - SpinningBadge.tsx: renders nothing until verified social proof exists.
   - src/app/edition.css: declares the --ed-cta-* values and the 999px
     pill radius themselves (Layer E).
   - @theme blocks in src/app/globals.css: register those values as the
     `cta` / `on-cta` / `cta-hover` / `cta-edge` colours and the `cta`
     radius (Layer S); registering is not using. */
const P8_ROUND_ALLOWED = new Set([
  "src/components/sections/LocationsMap.tsx",
  "src/components/sections/RouteJourney.tsx",
  "src/components/ui/SpinningBadge.tsx",
]);

function p8(ctx: RuleContext): Finding[] {
  const out: Finding[] = [];
  for (const info of ctx.infos) {
    const rel = info.file.rel;
    if (rel === BUTTON_TSX) continue;
    for (const s of info.strings) {
      for (const token of s.text.split(/\s+/).filter(Boolean)) {
        if (CTA_UTILITY.test(baseUtility(token))) {
          out.push({ rule: "P8", where: at(rel, s.line), what: `${token}: a gold CTA utility outside Button.tsx` });
        } else if (ROUND_UTILITY.test(baseUtility(token)) && !(P8_ROUND_ALLOWED.has(rel) && /rounded(?:-[a-z]+)?-(pill|full)/.test(token))) {
          out.push({ rule: "P8", where: at(rel, s.line), what: `${token}: a rounded shape outside Button.tsx` });
        }
      }
      if (CTA_REF.test(s.text)) {
        out.push({ rule: "P8", where: at(rel, s.line), what: `${s.text.match(CTA_REF)?.[0]}… referenced outside Button.tsx` });
      }
      if (PILL_RADIUS.test(s.text) && !P8_ROUND_ALLOWED.has(rel)) {
        out.push({ rule: "P8", where: at(rel, s.line), what: `"${s.text.trim().slice(0, 60)}": a pill radius outside Button.tsx` });
      }
    }
    for (const el of info.jsx) {
      const radius = styleProps(ctx.ts, info, el).get("borderRadius");
      if (radius && (/^50%$/.test(radius.trim()) || PILL_RADIUS.test(radius)) && !P8_ROUND_ALLOWED.has(rel)) {
        out.push({ rule: "P8", where: at(rel, el.line), what: `borderRadius ${radius} on <${el.tag}>: a round shape outside Button.tsx` });
      }
    }
  }
  for (const f of ctx.files.filter((x) => x.kind === "css")) {
    if (f.rel === EDITION_CSS) continue;
    for (const d of parseCss(f)) {
      if (f.rel === GLOBALS_CSS && inAtRule(d, "theme")) continue;
      if (d.prop === "@apply") {
        for (const token of d.value.split(/\s+/)) {
          if (CTA_UTILITY.test(baseUtility(token)) || ROUND_UTILITY.test(baseUtility(token))) {
            out.push({ rule: "P8", where: at(f.rel, d.line), what: `@apply ${token} outside Button.tsx` });
          }
        }
        continue;
      }
      if (CTA_REF.test(d.value) || CTA_REF.test(d.prop)) {
        out.push({ rule: "P8", where: at(f.rel, d.line), what: `${d.prop}: ${d.value} references the gold CTA tokens outside Button.tsx` });
      }
      if (/^border(-[a-z-]+)?-radius$/.test(d.prop) && (/(^|\s)50%/.test(d.value) || PILL_RADIUS.test(d.value))) {
        out.push({ rule: "P8", where: at(f.rel, d.line), what: `${d.prop}: ${d.value}: a round shape outside Button.tsx` });
      }
    }
  }
  return out;
}

/* P9 ---------------------------------------------------------------------- */

const HEX = /(?<![\w&%#/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/;
const COLOUR_FN = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|(?<![\w-])color\(\s*(?:srgb|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz)/i;
/* The CSS named colours (CSS Color 4), minus transparent / currentcolor. */
const NAMED_COLOURS =
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split(
    " ",
  );
const NAMED_COLOUR = new RegExp(`(?<![\\w-])(?:${NAMED_COLOURS.join("|")})(?![\\w-])`, "i");
const COLOUR_PROPS = /^(color|background(-color|-image)?|border(-[a-z-]+)?|outline(-color)?|box-shadow|text-shadow|fill|stroke|stop-color|flood-color|lighting-color|caret-color|accent-color|text-decoration(-color)?|column-rule(-color)?|scrollbar-color|(-webkit-)?mask(-image)?|--[\w-]+)$/;
const SVG_COLOUR_ATTRS = new Set(["fill", "stroke", "color", "stopColor", "floodColor", "lightingColor"]);
const STYLE_COLOUR_KEYS = /^(color|background(Color|Image)?|border(\w*Color)?|outlineColor|boxShadow|textShadow|fill|stroke|caretColor|accentColor|textDecorationColor|stopColor)$/;

/* P9 allowlist, commented per SPEC §I.2:
   (1) the contact form frame's `bg-white` (src/app/contact/page.tsx, one
       use): the untouched third-party form sits on white.
   (2) the mask stops inside src/app/globals.css utilities (`#000` / `black`
       in mask-image): an alpha mask, not a painted colour.
   The rule's own scope: src/app/edition.css, and src/lib/edition.ts, its
   TypeScript twin (THEME_COLOR, §B.5). The night-density black lives in
   edition.css (`--ed-night-density`), so it needs no entry. */
const P9_FORM_FRAME = { rel: "src/app/contact/page.tsx", token: "bg-white", max: 1 };

function p9(ctx: RuleContext): Finding[] {
  const out: Finding[] = [];
  const hit = (rel: string, line: number, what: string) => {
    out.push({ rule: "P9", where: at(rel, line), what });
  };
  const literalIn = (text: string) => {
    const decoded = text.replace(/%23/gi, "#");
    return decoded.match(HEX)?.[0] ?? decoded.match(COLOUR_FN)?.[0] ?? null;
  };

  let formFrameUses = 0;
  for (const info of ctx.infos) {
    const rel = info.file.rel;
    if (rel === EDITION_TS) continue;
    for (const s of info.strings) {
      const lit = literalIn(s.text);
      if (lit) hit(rel, s.line, `colour literal ${lit} in "${s.text.trim().slice(0, 60)}"`);
      if (!s.classLike) continue;
      for (const token of s.text.split(/\s+/).filter(Boolean)) {
        const colour = colourOf(token, ctx.theme);
        if (!colour || ctx.theme.appColours.has(colour) || !ctx.theme.defaultColours.has(colour)) continue;
        if (rel === P9_FORM_FRAME.rel && baseUtility(token) === P9_FORM_FRAME.token && formFrameUses < P9_FORM_FRAME.max) {
          formFrameUses++;
          continue;
        }
        hit(rel, s.line, `${token}: Tailwind's default palette colour "${colour}", not an edition token`);
      }
    }
    for (const el of info.jsx) {
      for (const name of SVG_COLOUR_ATTRS) {
        const value = initStrings(ctx.ts, jsxAttr(ctx.ts, info.sf, el, name)).join(" ");
        if (value && NAMED_COLOUR.test(value) && !literalIn(value)) {
          hit(rel, el.line, `${name}="${value}" on <${el.tag}>: a named colour`);
        }
      }
      for (const [key, value] of styleProps(ctx.ts, info, el)) {
        if (STYLE_COLOUR_KEYS.test(key) && NAMED_COLOUR.test(value.replace(/var\([^)]*\)/g, "")) && !literalIn(value)) {
          hit(rel, el.line, `style ${key}: ${value}: a named colour`);
        }
      }
    }
  }
  for (const f of ctx.files.filter((x) => x.kind === "css")) {
    if (f.rel === EDITION_CSS) continue;
    for (const d of parseCss(f)) {
      if (d.prop.startsWith("@")) continue;
      const mask = /^(-webkit-)?mask(-image)?$/.test(d.prop);
      if (mask && f.rel === GLOBALS_CSS) continue; // allowlist (2)
      const lit = literalIn(d.value);
      if (lit) {
        hit(f.rel, d.line, `${d.prop}: colour literal ${lit}`);
        continue;
      }
      if (COLOUR_PROPS.test(d.prop)) {
        const bare = d.value.replace(/url\([^)]*\)|var\([^)]*\)/g, "");
        const named = bare.match(NAMED_COLOUR)?.[0];
        if (named) hit(f.rel, d.line, `${d.prop}: named colour ${named}`);
      }
    }
  }
  return out;
}

/* P10 --------------------------------------------------------------------- */

const LEGACY_SCALE = /(?<![\w-])(?:[^\s:"'`]+:)*!?[a-z]+(?:-[a-z]+)*-(?:ocean|sand|gold|rock|olive)-\d{2,3}(?:\/[\w.]+)?!?(?![\w-])/;
const LEGACY_SHELL = /(?<![\w-])(?:[^\s:"'`]+:)*!?(?:bg|text|border(?:-[xytrblse])?|from|via|to|fill|stroke|ring|outline|divide|decoration|shadow|accent|caret|placeholder)-shell(?:\/[\w.]+)?!?(?![\w-])/;
const LEGACY_TEXTURE = /(?<![\w-])(?:[^\s:"'`]+:)*(?:sand|sand-overlay|sand-wash)(?![\w-])/;
const LEGACY_VAR = /--color-(?:(?:ocean|sand|gold|rock|olive)-\d{2,3}|shell)(?![\w-])/;

/* P10 has no allowlist: its two entries (the /design-3 drafts and
   FeaturedFrame.tsx) expired with their files at the C+ close (S15). */
function p10(ctx: RuleContext): Finding[] {
  const out: Finding[] = [];
  for (const info of ctx.infos) {
    const rel = info.file.rel;
    for (const s of info.strings) {
      const m = s.text.match(LEGACY_SCALE) ?? s.text.match(LEGACY_SHELL) ?? (s.classLike ? s.text.match(LEGACY_TEXTURE) : null) ?? s.text.match(LEGACY_VAR);
      if (m) out.push({ rule: "P10", where: at(rel, s.line), what: `legacy scale ${m[0]}` });
    }
  }
  for (const f of ctx.files.filter((x) => x.kind === "css")) {
    const seenSelectors = new Set<string>();
    for (const d of parseCss(f)) {
      const where = at(f.rel, d.line);
      if (LEGACY_VAR.test(d.prop)) {
        out.push({ rule: "P10", where, what: `legacy scale token ${d.prop} declared` });
      } else if (LEGACY_VAR.test(d.value)) {
        out.push({ rule: "P10", where, what: `${d.prop}: ${d.value.match(LEGACY_VAR)?.[0]} referenced` });
      } else if (d.prop === "@apply" && (LEGACY_SCALE.test(d.value) || LEGACY_SHELL.test(d.value))) {
        out.push({ rule: "P10", where, what: `@apply ${d.value}` });
      }
      const sel = declSelector(d);
      if (!seenSelectors.has(sel) && /\.(?:[\w-]+:)?[a-z-]+-(?:(?:ocean|sand|gold|rock|olive)-\d{2,3}|shell)(?![\w-])/.test(sel)) {
        seenSelectors.add(sel);
        out.push({ rule: "P10", where, what: `selector names a legacy scale utility: ${sel.slice(0, 80)}` });
      }
    }
  }
  return out;
}

/* P11 --------------------------------------------------------------------- */

/* P11 has no allowlist: its one entry (FeaturedFrame.tsx) expired with the
   file at the C+ close (S15). */

function p11(ctx: RuleContext): Finding[] {
  const out: Finding[] = [];
  const defined = (c: string) => COLOUR_KEYWORDS.has(c) || ctx.theme.appColours.has(c) || ctx.theme.defaultColours.has(c);
  for (const info of ctx.infos) {
    for (const s of info.strings) {
      if (!s.classLike) continue;
      for (const token of s.text.split(/\s+/).filter(Boolean)) {
        const colour = colourOf(token, ctx.theme);
        if (colour && !defined(colour)) {
          out.push({ rule: "P11", where: at(info.file.rel, s.line), what: `P11: ${colour} undefined (${token}: no --color-${colour} token)` });
        }
      }
    }
  }
  for (const f of ctx.files.filter((x) => x.kind === "css")) {
    for (const d of parseCss(f)) {
      if (d.prop === "@apply") {
        for (const token of d.value.split(/\s+/)) {
          const colour = colourOf(token, ctx.theme);
          if (colour && !defined(colour)) {
            out.push({ rule: "P11", where: at(f.rel, d.line), what: `P11: ${colour} undefined (@apply ${token})` });
          }
        }
        continue;
      }
      for (const m of d.value.matchAll(/var\(\s*--color-([\w-]+)/g)) {
        if (!defined(m[1])) {
          out.push({ rule: "P11", where: at(f.rel, d.line), what: `P11: ${m[1]} undefined (var(--color-${m[1]}))` });
        }
      }
    }
  }
  return out;
}

/* P12 --------------------------------------------------------------------- */

const EDITION_CONSTANTS = new Set(["GRADE", "THEME_COLOR", "DUOTONE", "ITALIC_EMPHASIS"]);

/* P12 has no allowlist: its one entry (the /design-3 drafts, which declared
   their own --ed-* values) expired with the drafts at the C+ close (S15). */
function p12(ctx: RuleContext): Finding[] {
  const out: Finding[] = [];
  for (const f of ctx.files.filter((x) => x.kind === "css")) {
    if (f.rel === EDITION_CSS) continue;
    for (const d of parseCss(f)) {
      if (/^--ed-/.test(d.prop)) {
        out.push({ rule: "P12", where: at(f.rel, d.line), what: `${d.prop} declared outside ${EDITION_CSS}` });
      }
    }
  }
  for (const info of ctx.infos) {
    const rel = info.file.rel;
    for (const k of info.customPropKeys) {
      if (k.name.startsWith("--ed-")) {
        out.push({ rule: "P12", where: at(rel, k.line), what: `${k.name} declared in a style object, outside ${EDITION_CSS}` });
      }
    }
    for (const s of info.strings) {
      const m = s.text.match(/(?:^|[\s[;{])(--ed-[\w-]+)\s*:/);
      if (m) out.push({ rule: "P12", where: at(rel, s.line), what: `${m[1]} declared in "${s.text.trim().slice(0, 60)}", outside ${EDITION_CSS}` });
    }
    if (rel === EDITION_TS) continue;
    for (const d of info.declared) {
      if (EDITION_CONSTANTS.has(d.name)) {
        out.push({ rule: "P12", where: at(rel, d.line), what: `${d.name} declared outside ${EDITION_TS}` });
      }
    }
  }

  /* D2 coupling: while the live grade is D, the CSS photo treatment is off. */
  const grade = editionGrade(ctx.byRel);
  const edition = ctx.byRel.get(EDITION_CSS);
  if (!grade) {
    out.push({ rule: "P12", where: EDITION_TS, what: "P12 coupling: GRADE constant not found (exactly one line-start declaration expected)" });
  } else if (!edition) {
    out.push({ rule: "P12", where: EDITION_CSS, what: "P12 coupling: the edition stylesheet is missing" });
  } else if (grade === "d") {
    for (const token of ["--ed-plate-grade", "--ed-plate-print"]) {
      const decls = parseCss(edition).filter((d) => d.prop === token);
      if (!decls.length) {
        out.push({ rule: "P12", where: EDITION_CSS, what: `P12 coupling: ${token} not declared while GRADE is "d"` });
      }
      for (const d of decls) {
        if (d.value !== "none") {
          out.push({ rule: "P12", where: at(EDITION_CSS, d.line), what: `P12 coupling: ${token} is "${d.value}" while GRADE is "d" (must be none)` });
        }
      }
    }
  }
  ctx.notes.push(`P12 coupling: GRADE "${grade ?? "?"}"${grade === "d" ? ", plate grade and print checked" : ", coupling applies only to grade d"}`);
  return out;
}

/* P13 --------------------------------------------------------------------- */

const FILTER_PROPS = new Set(["filter", "mix-blend-mode", "backdrop-filter", "-webkit-backdrop-filter"]);
const FILTER_STYLE_KEYS = new Set(["filter", "mixBlendMode", "backdropFilter", "WebkitBackdropFilter"]);
const FILTER_UTILITY =
  /^-?(?:blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia|filter|backdrop-[\w-]+|mix-blend-[\w-]+|bg-blend-[\w-]+)(?:-[^\s]+)?$/;
const HARMLESS_FILTER_VALUE = /^(none|normal|initial|unset)$/;
const PHOTO_TAGS = new Set(["Image", "img", "picture", "Plate", "PlateBand", "motion.img"]);
const CLIP_OR_GATE_TAGS = new Set(["Unclip", "ImageReveal", "Reveal", "RevealGroup"]);
const PHOTO_SELECTOR = /(?:^|[\s>+~,(])img(?![\w-])|\.plate[\w-]*|\[data-(?:hero|plate)[\]=~|^$*]/i;

/* The two allowlisted forms (SPEC §I.2 P13, §B.4), both in Plate.module.css. */
const P13_FILTER_ALLOWED = [
  { rel: PLATE_CSS, subject: /^\.img$/, prop: "filter", value: "var(--ed-plate-grade)" },
  { rel: PLATE_CSS, subject: /^\.cover::after$/, prop: "mix-blend-mode", value: "var(--ed-plate-print-blend)" },
];

/* §F.2's measured strengths: the largest value each texture token may take
   while every text floor holds on the darkest speck. */
const TEXTURE_LIMITS: [token: string, max: number][] = [
  ["--ed-paper-grain-opacity", 0.07],
  ["--ed-paper-mottle-opacity", 0.045],
  ["--ed-bone-grain-opacity", 0.06],
  ["--ed-bone-mottle-opacity", 0.03],
  ["--ed-night-grain-opacity", 0.045],
];
const VIGNETTE_MAX_ALPHA = 0.06;
const GRAIN_PEAK_ALPHA = 0.8;
const NIGHT_GRAIN_RECT_OPACITY = 0.9;

const wholeWord = (word: string) =>
  new RegExp(`(?<!\\p{L})${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\p{L})`, "u");

function contentStrings(): { strings: string[]; site: unknown } {
  const strings: string[] = [];
  let site: unknown = null;
  const walk = (v: unknown) => {
    if (typeof v === "string") strings.push(v.replace(/\*\*/g, ""));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  const dir = (d: string) => {
    if (!fsSync.existsSync(d)) return;
    for (const e of fsSync.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) dir(full);
      else if (e.name.endsWith(".json") && e.name !== "blur-map.json") {
        const json = JSON.parse(fsSync.readFileSync(full, "utf8"));
        if (posix(full) === "content/site.json") site = json;
        walk(json);
      }
    }
  };
  dir("content");
  return { strings, site };
}

function p13(ctx: RuleContext): Finding[] {
  const { ts } = ctx;
  const out: Finding[] = [];
  const push = (where: string, what: string) => out.push({ rule: "P13", where, what });

  /* (a–c) faux small caps, old-style figures, font synthesis: CSS. */
  let synthesisNone = false;
  for (const f of ctx.files.filter((x) => x.kind === "css")) {
    for (const d of parseCss(f)) {
      const where = at(f.rel, d.line);
      if ((d.prop === "font-variant-caps" || d.prop === "font-variant") && /small-caps|petite-caps|unicase|titling-caps/.test(d.value)) {
        push(where, `${d.prop}: ${d.value}: faux small caps (no served font has them)`);
      }
      if (d.prop === "font-feature-settings" && /smcp|c2sc|pcap|c2pc|onum/.test(d.value)) {
        push(where, `font-feature-settings: ${d.value}: a feature no served font carries`);
      }
      if (d.prop === "font-variant-numeric" && /oldstyle-nums/.test(d.value)) {
        push(where, `font-variant-numeric: ${d.value}: onum, which no served font carries`);
      }
      if (/^font-synthesis(-[a-z-]+)?$/.test(d.prop)) {
        if (d.value !== "none") push(where, `${d.prop}: ${d.value} (must be none)`);
        else if (d.prop === "font-synthesis" && f.rel === GLOBALS_CSS && subjects(declSelector(d)).includes("html")) synthesisNone = true;
      }
    }
  }
  if (!synthesisNone) push(GLOBALS_CSS, "html { font-synthesis: none } not found");

  /* (d) filter / blend / backdrop on a photograph: CSS. */
  for (const f of ctx.files.filter((x) => x.kind === "css")) {
    for (const d of parseCss(f)) {
      if (!FILTER_PROPS.has(d.prop) || HARMLESS_FILTER_VALUE.test(d.value)) continue;
      const sel = declSelector(d);
      const onPhoto = f.rel === PLATE_CSS || PHOTO_SELECTOR.test(sel);
      if (!onPhoto) continue;
      const allowed = P13_FILTER_ALLOWED.some(
        (a) => a.rel === f.rel && a.prop === d.prop && a.value === d.value && subjects(sel).every((s) => a.subject.test(s)),
      );
      if (!allowed) push(at(f.rel, d.line), `${sel} { ${d.prop}: ${d.value} }: a filter or blend on a photograph`);
    }
  }

  /* (a–c) and (d–g) in TSX. */
  const { strings: content, site } = contentStrings();
  let emphasisChecked = 0;
  let emphasisAgainstContent = 0;

  const attrExpr = (attr: TS.JsxAttribute | undefined): TS.Expression | undefined => {
    const init = attr?.initializer;
    if (!init) return undefined;
    if (ts.isStringLiteral(init)) return init;
    if (ts.isJsxExpression(init)) return init.expression;
    return undefined;
  };
  /* Every string an expression can be: a literal; a `site.…` path into
     content/site.json; or a component prop, followed one level up to every
     `<Component prop={…}>` call site in the tree. null = not resolvable. */
  const resolveTexts = (info: TsInfo, expr: TS.Expression | undefined, depth = 0): string[] | null => {
    if (!expr) return null;
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return [expr.text];
    if (ts.isPropertyAccessExpression(expr) && site) {
      const chain = expr.getText(info.sf).replace(/\?\./g, ".").split(".");
      for (let start = 0; start < chain.length; start++) {
        let v: unknown = site;
        for (const key of chain.slice(start)) v = v && typeof v === "object" ? (v as Record<string, unknown>)[key] : undefined;
        if (typeof v === "string") return [v.replace(/\*\*/g, "")];
      }
      return null;
    }
    if (ts.isIdentifier(expr) && depth === 0) {
      let fn: TS.Node | undefined = expr.parent;
      while (fn && !ts.isFunctionDeclaration(fn) && !ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) fn = fn.parent;
      if (!fn) return null;
      const fnLike = fn as TS.FunctionLikeDeclaration;
      const name =
        ts.isFunctionDeclaration(fn) && fn.name
          ? fn.name.text
          : fn.parent && ts.isVariableDeclaration(fn.parent) && ts.isIdentifier(fn.parent.name)
            ? fn.parent.name.text
            : null;
      const param = fnLike.parameters[0];
      if (!name || !param || !ts.isObjectBindingPattern(param.name)) return null;
      const binding = param.name.elements.find((b) => ts.isIdentifier(b.name) && b.name.text === expr.text);
      if (!binding) return null;
      const prop = binding.propertyName ? binding.propertyName.getText(info.sf) : expr.text;
      const found: string[] = [];
      let sites = 0;
      for (const other of ctx.infos) {
        for (const call of other.jsx.filter((j) => j.tag === name)) {
          sites++;
          const texts = resolveTexts(other, attrExpr(jsxAttr(ts, other.sf, call, prop)), depth + 1);
          if (!texts) return null;
          found.push(...texts);
        }
      }
      return sites ? found : null;
    }
    return null;
  };

  for (const info of ctx.infos) {
    const rel = info.file.rel;

    for (const s of info.strings) {
      for (const token of s.text.split(/\s+/).filter(Boolean)) {
        const u = baseUtility(token);
        if (/^\[font-variant(-caps)?:[^\]]*(small|petite)[_-]caps/.test(u) || /^\[font-feature-settings:[^\]]*(smcp|c2sc|pcap|c2pc|onum)/.test(u)) {
          push(at(rel, s.line), `${token}: faux small caps or a missing feature`);
        }
        if (s.classLike && u === "oldstyle-nums") push(at(rel, s.line), `${token}: onum, which no served font carries`);
        if (/^\[font-synthesis(-[a-z-]+)?:(?!none\])/.test(u)) push(at(rel, s.line), `${token}: font-synthesis must be none`);
      }
    }

    for (const el of info.jsx) {
      const where = at(rel, el.line);
      const style = styleProps(ts, info, el);
      for (const [key, value] of style) {
        if (key === "fontVariantCaps" && /small|petite/.test(value)) push(where, `style fontVariantCaps: ${value}`);
        if (key === "fontFeatureSettings" && /smcp|c2sc|pcap|c2pc|onum/.test(value)) push(where, `style fontFeatureSettings: ${value}`);
        if (/^fontSynthesis/.test(key) && !/^["']?none["']?$/.test(value)) push(where, `style ${key}: ${value} (must be none)`);
      }

      /* (d) on a photograph element or the hero itself. */
      const isHero = !!jsxAttr(ts, info.sf, el, "data-hero");
      if (PHOTO_TAGS.has(el.tag) || isHero || jsxAttr(ts, info.sf, el, "data-plate")) {
        for (const token of classTokens(ts, info, el)) {
          const u = baseUtility(token);
          const arbitrary = u.match(/^\[(?:-webkit-)?(filter|mix-blend-mode|backdrop-filter):([^\]]*)\]$/);
          if ((FILTER_UTILITY.test(u) && !/-(none|normal)$/.test(u)) || (arbitrary && !HARMLESS_FILTER_VALUE.test(arbitrary[2]))) {
            push(where, `${token} on <${el.tag}>: a filter or blend on a photograph`);
          }
        }
        for (const [key, value] of style) {
          if (FILTER_STYLE_KEYS.has(key) && !HARMLESS_FILTER_VALUE.test(value.replace(/["']/g, ""))) {
            push(where, `style ${key}: ${value} on <${el.tag}>: a filter or blend on a photograph`);
          }
        }
        for (const m of moduleDecls(ts, info, el)) {
          for (const d of m.decls) {
            if (!FILTER_PROPS.has(d.prop) || HARMLESS_FILTER_VALUE.test(d.value)) continue;
            const allowed = P13_FILTER_ALLOWED.some(
              (a) => a.rel === m.rel && a.prop === d.prop && a.value === d.value && subjects(declSelector(d)).every((s) => a.subject.test(s)),
            );
            if (!allowed) push(where, `.${m.name} { ${d.prop}: ${d.value} } (${m.rel}) on <${el.tag}>: a filter or blend on a photograph`);
          }
        }
      }

      /* (e) no clip-path and no opacity gate inside [data-hero] (M1). */
      if (isHero) {
        for (const d of jsxDescendants(ts, info, el)) {
          const dWhere = `${at(rel, d.line)} (in [data-hero] at line ${el.line})`;
          if (CLIP_OR_GATE_TAGS.has(d.tag)) push(dWhere, `<${d.tag}>: a clip or opacity gate on a hero descendant`);
          if (d.tag === "Plate" && jsxAttr(ts, info.sf, d, "unclip")) {
            const init = jsxAttr(ts, info.sf, d, "unclip")?.initializer;
            if (!init || !/\{\s*false\s*\}/.test(init.getText(info.sf))) push(dWhere, "<Plate unclip>: a clip on a hero descendant");
          }
          for (const token of classTokens(ts, info, d)) {
            const u = baseUtility(token);
            if (u === "opacity-0" || /^\[opacity:0(\.0+)?\]$/.test(u) || /^\[clip-path:(?!none\])/.test(u)) {
              push(dWhere, `${token}: a clip or opacity gate on a hero descendant`);
            }
          }
          const dStyle = styleProps(ts, info, d);
          if ((dStyle.get("clipPath") ?? "none").replace(/["']/g, "") !== "none") push(dWhere, `style clipPath: ${dStyle.get("clipPath")}`);
          if (/^["']?0(\.0+)?["']?$/.test(dStyle.get("opacity") ?? "")) push(dWhere, "style opacity: 0");
          const initial = jsxAttr(ts, info.sf, d, "initial")?.initializer?.getText(info.sf) ?? "";
          if (/opacity\s*:\s*0(?![.\d]*[1-9])|clipPath/.test(initial)) push(dWhere, `initial=${initial.slice(0, 50)}: a clip or opacity gate`);
          for (const m of moduleDecls(ts, info, d)) {
            for (const decl of m.decls) {
              if ((decl.prop === "clip-path" && decl.value !== "none") || (decl.prop === "opacity" && /^0(\.0+)?$/.test(decl.value))) {
                push(dWhere, `.${m.name} { ${decl.prop}: ${decl.value} }: a clip or opacity gate on a hero descendant`);
              }
            }
          }
        }
      }

      /* (f) hidden overflow over a sticky child in the same component. */
      const clips =
        classTokens(ts, info, el).some((t) => /^overflow(-[xy])?-hidden$/.test(baseUtility(t))) ||
        moduleDecls(ts, info, el).some((m) => m.decls.some((d) => /^overflow(-[xy])?$/.test(d.prop) && /\bhidden\b/.test(d.value))) ||
        [...style].some(([k, v]) => /^overflow[XY]?$/.test(k) && /hidden/.test(v));
      if (clips) {
        for (const d of jsxDescendants(ts, info, el)) {
          const sticky =
            classTokens(ts, info, d).some((t) => baseUtility(t) === "sticky") ||
            moduleDecls(ts, info, d).some((m) => m.decls.some((x) => x.prop === "position" && x.value === "sticky")) ||
            /sticky/.test(styleProps(ts, info, d).get("position") ?? "") ||
            (d.tag === "Caption" && initStrings(ts, jsxAttr(ts, info.sf, d, "placement")).includes("sticky")) ||
            (d.tag === "PlateBand" && initStrings(ts, jsxAttr(ts, info.sf, d, "kind")).includes("place"));
          if (sticky) {
            push(where, `hidden overflow on <${el.tag}> clips its sticky child <${d.tag}> (line ${d.line}); use overflow-x: clip`);
          }
        }
      }

      /* (g) the emphasis word is a whole word of its text. */
      const wordAttr = el.tag === "SplitLines" ? "emphasis" : el.tag === "Emphasis" ? "word" : null;
      const word = wordAttr ? jsxAttr(ts, info.sf, el, wordAttr) : undefined;
      if (wordAttr && word) {
        const words = resolveTexts(info, attrExpr(word));
        if (!words || words.length !== 1) {
          push(where, `${wordAttr}=${word.initializer?.getText(info.sf)} on <${el.tag}>: not a literal, cannot be checked`);
          continue;
        }
        const wordText = words[0];
        emphasisChecked++;
        const linesExpr = attrExpr(jsxAttr(ts, info.sf, el, "lines"));
        const lines =
          linesExpr && ts.isArrayLiteralExpression(linesExpr) && linesExpr.elements.every((e) => ts.isStringLiteral(e))
            ? linesExpr.elements.map((e) => (e as TS.StringLiteral).text)
            : null;
        const texts = resolveTexts(info, attrExpr(jsxAttr(ts, info.sf, el, "text")));
        for (const text of texts ?? []) {
          if (lines && lines.join(" ") !== text) {
            push(where, `lines ${JSON.stringify(lines)} do not join to the text "${text}"`);
          }
        }
        const targets = texts ?? (lines ? [lines.join(" ")] : null);
        if (targets) {
          for (const target of targets) {
            if (!wholeWord(wordText).test(target)) {
              push(where, `${wordAttr}="${wordText}" is not a whole word of "${target}"`);
            }
          }
        } else {
          emphasisAgainstContent++;
          if (!content.some((c) => wholeWord(wordText).test(c))) {
            push(where, `${wordAttr}="${wordText}" is not a whole word of any content string (its text is not a literal)`);
          }
        }
      }
    }
  }
  ctx.notes.push(
    `P13 emphasis: ${emphasisChecked} checked` +
      (emphasisAgainstContent ? ` (${emphasisAgainstContent} whose text is an expression, checked against the content strings)` : ""),
  );

  /* (h) texture strengths within §F.2's measured floor. */
  const edition = ctx.byRel.get(EDITION_CSS);
  const decls = edition ? parseCss(edition) : [];
  for (const [token, max] of TEXTURE_LIMITS) {
    const found = decls.filter((d) => d.prop === token);
    if (!found.length) push(EDITION_CSS, `${token} not declared`);
    for (const d of found) {
      const v = Number(d.value);
      if (!Number.isFinite(v) || v > max) push(at(EDITION_CSS, d.line), `${token}: ${d.value} is above the measured strength ${max} (§F.2)`);
    }
  }
  const vignettes = decls.filter((d) => d.prop === "--ed-paper-vignette");
  if (!vignettes.length) push(EDITION_CSS, "--ed-paper-vignette not declared");
  for (const d of vignettes) {
    if (d.value === "none") continue;
    const alphas = [...d.value.matchAll(/rgba?\([^)]*?[/,]\s*([\d.]+)(%?)\s*\)/g)].map((m) => Number(m[1]) / (m[2] ? 100 : 1));
    if (!alphas.length || alphas.some((a) => !(a <= VIGNETTE_MAX_ALPHA))) {
      push(at(EDITION_CSS, d.line), `--ed-paper-vignette: corner alpha ${alphas.join(", ") || "?"} is above ${VIGNETTE_MAX_ALPHA} (§F.2)`);
    }
  }
  const globals = ctx.byRel.get(GLOBALS_CSS);
  for (const d of globals ? parseCss(globals) : []) {
    const ctxSel = declSelector(d);
    if (d.prop === "background-image" && /(?:paper|bone)-stock-layer/.test(ctxSel)) {
      for (const m of d.value.matchAll(/feColorMatrix[^>]*?values='([^']*)'/g)) {
        const alpha = Number(m[1].trim().split(/\s+/)[15]);
        if (!(alpha <= GRAIN_PEAK_ALPHA)) push(at(GLOBALS_CSS, d.line), `${ctxSel}: grain peak alpha ${alpha} is above ${GRAIN_PEAK_ALPHA} (§F.2)`);
      }
    }
    if (d.prop === "background-image" && /\.grain-overlay/.test(ctxSel)) {
      for (const m of d.value.matchAll(/filter='url\(%23\w+\)' opacity='([\d.]+)'/g)) {
        if (!(Number(m[1]) <= NIGHT_GRAIN_RECT_OPACITY)) push(at(GLOBALS_CSS, d.line), `.grain-overlay: rect opacity ${m[1]} is above ${NIGHT_GRAIN_RECT_OPACITY} (§F.2)`);
      }
    }
  }
  return out;
}

/* ---- running the C+ rules ------------------------------------------------ */

const CPLUS_RULES: [id: string, title: string, run: (ctx: RuleContext) => Finding[]][] = [
  ["P8", "gold only on the pill; the pill the only rounded control.", p8],
  ["P9", "colour literals belong in src/app/edition.css.", p9],
  ["P10", "no legacy colour scale is left.", p10],
  ["P11", "every colour utility resolves to a defined --color-* token.", p11],
  ["P12", "edition values are declared only in the edition files; the grade-D coupling holds.", p12],
  ["P13", "type, photographs, hero, sticky, emphasis and texture rules.", p13],
];

async function cplusRuleErrors(notes: string[]): Promise<Error[]> {
  const ts = await loadTs();
  const files = await readSources();
  const byRel = new Map(files.map((f) => [f.rel, f]));
  const infos = await Promise.all(files.filter((f) => f.kind === "ts").map((f) => analyseTs(f, byRel)));
  const ctx: RuleContext = { ts, files, byRel, infos, theme: readTheme(files), notes };
  const errors: Error[] = [];
  for (const [id, title, run] of CPLUS_RULES) {
    const findings = run(ctx);
    if (findings.length) errors.push(ruleError(id, title, findings));
  }
  return errors;
}

/* P14 -----------------------------------------------------------------------
   The committed environment (CUTOVER.md). Every `.env*` file is gitignored;
   the one that may be force-added is `.env.production`, and it may hold one
   line: the cutover switch, NEXT_PUBLIC_SITE_URL, set to the canonical origin
   (content/site.json brand.url). Anything else committed is a secret on its
   way to GitHub, or a second switch nobody reviews. Both copies are read: the
   git index (what the next commit contains) and the working tree (what a
   local build reads). */
function assertCommittedEnv(notes: string[]): void {
  const git = (...args: string[]) =>
    execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const tracked = git("ls-files", "-z", "--", ":(glob)**/.env*").split("\0").filter(Boolean);
  const site = JSON.parse(fsSync.readFileSync(path.join("content", "site.json"), "utf8")) as {
    brand: { url: string };
  };
  const want = `NEXT_PUBLIC_SITE_URL=${site.brand.url.replace(/\/$/, "")}`;
  const lines = (text: string) =>
    text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  /* Variable names only: a value may be a secret. Next's dotenv (@next/env)
     also accepts `KEY: value` lines and quoted values that span lines, so the
     names are read with that grammar over the whole text (a multi-line value
     is consumed as one entry), and anything that is not a conventional
     variable name is counted, never printed. */
  const DOTENV_ENTRY =
    /^[ \t]*(?:export[ \t]+)?([\w.-]+)(?:[ \t]*=|:[ \t])(?:[ \t]*'(?:\\'|[^'])*'|[ \t]*"(?:\\"|[^"])*"|[ \t]*`(?:\\`|[^`])*`|[^#\n]*)/gm;
  const variableNames = (text: string) => {
    const keys = [...text.replace(/\r\n?/g, "\n").matchAll(DOTENV_ENTRY)].map((m) => m[1]);
    const named = keys.filter((k) => /^[A-Z][A-Z0-9_]{0,63}$/.test(k));
    const other = keys.length - named.length;
    const parts = [...named, ...(other ? [`${other} unrecognised entr${other === 1 ? "y" : "ies"}`] : [])];
    return parts.join(", ") || "nothing a variable name can be read from";
  };
  const offenders: string[] = [];

  for (const file of tracked) {
    if (file !== ".env.production") {
      offenders.push(`${file}  is committed; only .env.production may be (force-added, CUTOVER.md)`);
      continue;
    }
    const copies: [string, string | null][] = [
      ["committed", git("show", `:${file}`)],
      ["working tree", fsSync.existsSync(file) ? fsSync.readFileSync(file, "utf8") : null],
    ];
    for (const [where, text] of copies) {
      if (text === null) continue;
      const found = lines(text);
      if (found.length === 1 && found[0] === want) continue;
      // The switch's own value is not a secret, so it is shown; nothing else is.
      const names = variableNames(text);
      const value =
        found.length === 1 && found[0].startsWith("NEXT_PUBLIC_SITE_URL=")
          ? ` = ${found[0].slice("NEXT_PUBLIC_SITE_URL=".length)}`
          : "";
      offenders.push(`${file} (${where})  holds ${names}${value}; it may hold exactly ${want}`);
    }
  }

  notes.push(
    tracked.length
      ? `P14 committed env: ${tracked.join(", ")}${offenders.length ? "" : `, holding only ${want}`}`
      : "P14 committed env: none (the cutover switch is unset)",
  );
  if (offenders.length) {
    throw new Error(
      `PREFLIGHT FAILED (P14): committed environment.\n` +
        `Only .env.production may be committed, and only with the cutover switch at the canonical origin:\n` +
        offenders.map((o) => `  P14  ${o}`).join("\n"),
    );
  }
}

/** The file-based rules, runnable on their own: `node qa/preflight.mts`. */
export async function assertSourceRules(notes: string[] = []): Promise<void> {
  const errors: Error[] = [];
  for (const rule of [
    assertNoGrainPositionClash,
    () => assertStockTexturePairing(),
    () => assertCommittedEnv(notes),
  ]) {
    try {
      await rule();
    } catch (error) {
      errors.push(error as Error);
    }
  }
  if (cplusS9("rules")) errors.push(...(await cplusRuleErrors(notes)));
  if (errors.length) throw new Error(errors.map((e) => e.message).join("\n\n"));
}

/**
 * Throws if the target isn't serving. Never let a capture run report success
 * against a server that isn't there.
 */
export async function preflight(base: string, outDir: string): Promise<BuildStamp> {
  await assertSourceRules();

  let res: Response;
  try {
    res = await fetch(base, { redirect: "manual" });
  } catch (err) {
    throw new Error(
      `PREFLIGHT FAILED: ${base} is not responding (${(err as Error).message}).\n` +
        `Start the production server first:  npx next start -p 3009`,
    );
  }
  /* Bot mitigation is its own outcome, not a deployment failure.
   *
   * Vercel challenges automated traffic when it sees enough of it, and a full
   * verification round is a lot: nine guards, a five-run Lighthouse pass over
   * two routes, a capture run, and an alias poll every fifteen seconds. Run a
   * few rounds back to back and every request starts coming back 403 with
   * `X-Vercel-Mitigated: challenge`.
   *
   * That looked exactly like a dead deployment once, and cost a session's
   * verification: the build was `● Ready` and a real browser was unaffected
   * while every headless request was refused. So the two states are told
   * apart here, by name, and the message says which one this is. A challenge
   * is the edge declining to answer a robot — it says nothing whatsoever
   * about whether the build is good, and it must never be reported as
   * "not deployed". */
  const mitigated = res.headers.get("x-vercel-mitigated");
  const challengeToken = res.headers.get("x-vercel-challenge-token");
  if (res.status === 403 && (mitigated === "challenge" || challengeToken)) {
    throw new Error(
      `VERIFICATION BLOCKED BY BOT MITIGATION — not a deployment failure.\n` +
        `  ${base} answered 403 with x-vercel-mitigated: ${mitigated ?? "(token present)"}.\n` +
        `  The edge is challenging automated requests from this IP. The build may be\n` +
        `  perfectly healthy and a real browser unaffected — this says nothing about it.\n` +
        `\n` +
        `  Check build state through the authenticated API, which is not challenged:\n` +
        `    npx vercel inspect <deployment-url> --scope domisi | grep -i status\n` +
        `\n` +
        `  Then wait it out and re-run ONCE rather than in a loop. Do not try to work\n` +
        `  around the challenge: it exists to be solved by a browser.`,
    );
  }

  if (res.status >= 500) {
    throw new Error(`PREFLIGHT FAILED: ${base} returned ${res.status}`);
  }

  /* The stylesheet must actually load.
   *
   * A server left running across a rebuild serves HTML that references the
   * PREVIOUS build's CSS chunk, which no longer exists — it 500s, the page
   * renders completely unstyled, and every content-based guard still passes
   * because the words are all there. What it looked like downstream: the
   * headline guard reporting exact doubling on every headline, because
   * `invisible` was not applying to the measuring copy so both copies were
   * "visible". Twenty minutes chasing a SplitLines bug that did not exist.
   *
   * Any capture taken in that state is worthless, so no run should start in
   * it. */
  const html = await res.clone().text();
  const cssHref = html.match(/\/_next\/static\/[^"']+\.css/)?.[0];
  if (cssHref) {
    const cssRes = await fetch(new URL(cssHref, base)).catch(() => null);
    if (!cssRes || cssRes.status >= 400) {
      throw new Error(
        `PREFLIGHT FAILED: the stylesheet ${cssHref} returned ` +
          `${cssRes?.status ?? "no response"}.
` +
          `The page will render UNSTYLED and every capture will be worthless, ` +
          `while content guards still pass.
` +
          `Usually a server left running across a rebuild: restart it.`,
      );
    }
  }

  const stamp: BuildStamp = {
    commit: git("rev-parse --short HEAD"),
    dirty: git("status --porcelain").length > 0,
    base,
    capturedAt: new Date().toISOString(),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "_BUILD.json"),
    JSON.stringify(stamp, null, 2),
  );

  console.log(
    `preflight ok — ${base} live, rendering ${stamp.commit}${stamp.dirty ? " (working tree dirty)" : ""}`,
  );
  if (stamp.dirty) {
    console.log(
      "  ! working tree is dirty: these captures may not match any commit",
    );
  }
  return stamp;
}

/* Run directly (`node qa/preflight.mts`), the file-based rules run on their
   own, without a server; imported by a capture script, nothing runs here. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(cplusS9Line("rules"));
  const notes: string[] = [];
  try {
    await assertSourceRules(notes);
    for (const note of notes) console.log(`  note  ${note}`);
    console.log(
      cplusS9("rules")
        ? "preflight source rules ok (P1 grain position, P7 stock texture pairing, P8-P13 C+ rules)"
        : "preflight source rules ok (P1 grain position, P7 stock texture pairing; P8-P13 off until S9)",
    );
  } catch (error) {
    for (const note of notes) console.log(`  note  ${note}`);
    console.log((error as Error).message);
    console.log("\nPREFLIGHT SOURCE RULES FAILED");
    process.exitCode = 1;
  }
}
