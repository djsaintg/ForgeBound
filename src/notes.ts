// Builder's notes for the login screen, parsed from CHANGELOG.md and ROADMAP.md.
// Both files are inlined at build time (?raw), so the panel follows each release
// without hand-editing and still makes zero network requests.
import changelogMd from "../CHANGELOG.md?raw";
import roadmapMd from "../ROADMAP.md?raw";

export interface Release {
  version: string;
  title: string;
  date: string;
  intro: string;
  sections: { heading: string; bullets: string[] }[];
}

export interface Planned {
  version: string;
  title: string;
  teasers: string[];
}

/** The login shows the current release and the one before it. */
const HISTORY = 2;

/** Joins wrapped lines back into paragraphs / bullets. */
function unwrap(lines: string[]): { paras: string[]; bullets: string[] } {
  const paras: string[] = [];
  const bullets: string[] = [];
  let cur: string[] | null = null;
  let target = paras;
  const flush = () => {
    if (cur?.length) target.push(cur.join(" "));
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("- ")) {
      flush();
      target = bullets;
      cur = [line.slice(2)];
    } else {
      if (!cur) { target = paras; cur = []; }
      cur.push(line);
    }
  }
  flush();
  return { paras, bullets };
}

// "## [0.3.2] — Gamma v0.3.2 · Gathering Fixes — 2026-10-24"  or  "## [0.2.0] — 2026-07-25"
const RELEASE_RE = /^## \[(\d+\.\d+\.\d+)\]\s*—\s*(.*)$/;

export function parseChangelog(md: string, limit = HISTORY): Release[] {
  const out: Release[] = [];
  const blocks = md.split(/^(?=## )/m);
  for (const block of blocks) {
    const [head, ...body] = block.split("\n");
    const m = RELEASE_RE.exec(head.trim());
    if (!m) continue;
    const parts = m[2].split("—").map((s) => s.trim());
    const date = parts.length > 1 ? parts.pop()! : parts[0];
    const named = parts.length && parts[0] !== date ? parts.join(" — ") : "";
    const title = named.includes("·") ? named.split("·").pop()!.trim() : "";

    const rel: Release = { version: m[1], title, date, intro: "", sections: [] };
    const chunks = body.join("\n").split(/^### /m);
    rel.intro = unwrap(chunks[0].split("\n")).paras.join(" ");
    for (const chunk of chunks.slice(1)) {
      const [heading, ...lines] = chunk.split("\n");
      const { bullets } = unwrap(lines);
      if (bullets.length) rel.sections.push({ heading: heading.trim(), bullets });
    }
    out.push(rel);
    if (out.length >= limit) break;
  }
  return out;
}

// Only "**Teaser:**" lines under a "## vX.Y.Z … (planned)" heading are public —
// everything else in the roadmap is private planning and never reaches the page.
const PLANNED_RE = /^## v(\d+\.\d+\.\d+)\s*—\s*(.*?)\s*\(planned\)/;
const TEASER_RE = /^\s*(?:-\s*)?\*\*Teaser:\*\*\s*(.+)$/;

export function parseRoadmap(md: string): Planned[] {
  const out: Planned[] = [];
  let cur: Planned | null = null;
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) {
      const m = PLANNED_RE.exec(line);
      cur = m ? { version: m[1], title: m[2], teasers: [] } : null;
      if (cur) out.push(cur);
      continue;
    }
    const t = cur && TEASER_RE.exec(line);
    if (t) cur!.teasers.push(t[1].trim());
  }
  return out.filter((p) => p.teasers.length);
}

export const RELEASES = parseChangelog(changelogMd);
export const PLANNED = parseRoadmap(roadmapMd);
