// One-off (re-runnable) generator for blog cover images. Produces
// brand-consistent, geometric cover art — not stock photography — as
// compressed WebP via sharp (already a transitive dependency of astro).
// Run with: node scripts/generate-blog-covers.mjs
//
// Design: 1200x630 (standard OG/social size), accent-blue gradient
// background matching global.css's --color-accent, a white icon badge
// per post (simple primitive shapes, not illustration), the post title
// in the site's serif display voice, and a small wordmark for brand
// consistency across every post's cover.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/content/blog/covers");

const WIDTH = 1200;
const HEIGHT = 630;
const ACCENT = "#2A4FB8"; // matches --color-accent (light) / public/favicon.svg
const ACCENT_DARK = "#1F3A8F";

// Simple primitive-shape icons, drawn in a local 0-160 box, white on the
// accent badge circle. Deliberately basic geometry, not illustration.
const icons = {
  checkCircle: `
    <circle cx="80" cy="80" r="58" fill="none" stroke="${ACCENT}" stroke-width="8"/>
    <polyline points="52,82 72,102 112,58" fill="none" stroke="${ACCENT}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  bars: `
    <rect x="38" y="92" width="20" height="40" fill="${ACCENT}"/>
    <rect x="70" y="70" width="20" height="62" fill="${ACCENT}"/>
    <rect x="102" y="42" width="20" height="90" fill="${ACCENT}"/>
  `,
  lock: `
    <rect x="46" y="76" width="68" height="52" rx="8" fill="none" stroke="${ACCENT}" stroke-width="8"/>
    <path d="M 58 76 V 58 a 22 22 0 0 1 44 0 v 18" fill="none" stroke="${ACCENT}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="80" cy="102" r="7" fill="${ACCENT}"/>
  `,
  shield: `
    <path d="M 80 34 L 122 50 V 88 C 122 112 104 128 80 136 C 56 128 38 112 38 88 V 50 Z" fill="none" stroke="${ACCENT}" stroke-width="8" stroke-linejoin="round"/>
    <polyline points="60,84 76,100 104,66" fill="none" stroke="${ACCENT}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  scale: `
    <line x1="80" y1="38" x2="80" y2="118" stroke="${ACCENT}" stroke-width="8" stroke-linecap="round"/>
    <line x1="38" y1="58" x2="122" y2="58" stroke="${ACCENT}" stroke-width="8" stroke-linecap="round"/>
    <path d="M 38 58 L 26 90 a 16 16 0 0 0 24 0 Z" fill="none" stroke="${ACCENT}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M 122 58 L 110 90 a 16 16 0 0 0 24 0 Z" fill="none" stroke="${ACCENT}" stroke-width="7" stroke-linejoin="round"/>
    <line x1="62" y1="122" x2="98" y2="122" stroke="${ACCENT}" stroke-width="8" stroke-linecap="round"/>
  `,
  mapPin: `
    <path d="M 80 36 C 104 36 122 54 122 78 C 122 108 80 132 80 132 C 80 132 38 108 38 78 C 38 54 56 36 80 36 Z" fill="none" stroke="${ACCENT}" stroke-width="8" stroke-linejoin="round"/>
    <circle cx="80" cy="78" r="16" fill="${ACCENT}"/>
  `,
  document: `
    <rect x="46" y="32" width="68" height="96" rx="6" fill="none" stroke="${ACCENT}" stroke-width="7"/>
    <line x1="58" y1="56" x2="102" y2="56" stroke="${ACCENT}" stroke-width="6" stroke-linecap="round"/>
    <line x1="58" y1="74" x2="102" y2="74" stroke="${ACCENT}" stroke-width="6" stroke-linecap="round"/>
    <line x1="58" y1="92" x2="88" y2="92" stroke="${ACCENT}" stroke-width="6" stroke-linecap="round"/>
    <line x1="58" y1="110" x2="94" y2="110" stroke="${ACCENT}" stroke-width="6" stroke-linecap="round"/>
  `,
  percentBadge: `
    <circle cx="80" cy="80" r="58" fill="none" stroke="${ACCENT}" stroke-width="8"/>
    <circle cx="62" cy="62" r="9" fill="${ACCENT}"/>
    <circle cx="98" cy="98" r="9" fill="${ACCENT}"/>
    <line x1="58" y1="102" x2="102" y2="58" stroke="${ACCENT}" stroke-width="8" stroke-linecap="round"/>
  `,
  calendar: `
    <rect x="40" y="46" width="80" height="76" rx="6" fill="none" stroke="${ACCENT}" stroke-width="7"/>
    <line x1="40" y1="68" x2="120" y2="68" stroke="${ACCENT}" stroke-width="7"/>
    <line x1="60" y1="34" x2="60" y2="54" stroke="${ACCENT}" stroke-width="7" stroke-linecap="round"/>
    <line x1="100" y1="34" x2="100" y2="54" stroke="${ACCENT}" stroke-width="7" stroke-linecap="round"/>
    <rect x="54" y="82" width="16" height="16" fill="${ACCENT}"/>
    <rect x="90" y="82" width="16" height="16" fill="${ACCENT}"/>
  `,
  clock: `
    <circle cx="80" cy="80" r="58" fill="none" stroke="${ACCENT}" stroke-width="8"/>
    <line x1="80" y1="80" x2="80" y2="46" stroke="${ACCENT}" stroke-width="8" stroke-linecap="round"/>
    <line x1="80" y1="80" x2="106" y2="94" stroke="${ACCENT}" stroke-width="8" stroke-linecap="round"/>
  `,
};

// Very small greedy word-wrapper. Widths are approximate (serif display
// face, ~0.56em average glyph width) — good enough for a generated cover
// image, not typeset copy.
function wrapTitle(title, maxCharsPerLine = 21, maxLines = 3) {
  const words = title.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    truncated[maxLines - 1] = truncated[maxLines - 1].replace(/[.,;:]?$/, "…");
    return truncated;
  }
  return lines;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvg({ title, icon }) {
  const lines = wrapTitle(title);
  const lineHeight = 66;
  const fontSize = 54;
  const textBlockHeight = lines.length * lineHeight;
  const startY = HEIGHT - 96 - textBlockHeight + fontSize;

  const textLines = lines
    .map(
      (line, i) =>
        `<text x="80" y="${startY + i * lineHeight}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" fill="#FAFAFA">${escapeXml(line)}</text>`,
    )
    .join("\n");

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${ACCENT}"/>
        <stop offset="100%" stop-color="${ACCENT_DARK}"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
    <circle cx="140" cy="140" r="78" fill="#FAFAFA"/>
    <g transform="translate(60,60)">${icon}</g>
    ${textLines}
    <text x="80" y="52" font-family="ui-monospace, Consolas, monospace" font-size="22" letter-spacing="1" fill="#FAFAFA" opacity="0.75">BYTETECH247 TOOLS</text>
  </svg>`;
}

const covers = [
  {
    slug: "is-paycheck-calculator-accurate",
    title: "Is This Paycheck Calculator Actually Accurate?",
    icon: icons.checkCircle,
  },
  {
    slug: "2026-federal-tax-brackets",
    title: "2026 Federal Tax Brackets: The Actual IRS Numbers",
    icon: icons.bars,
  },
  {
    slug: "does-paycheck-calculator-sell-data",
    title: "Does Your Paycheck Calculator Sell Your Data?",
    icon: icons.lock,
  },
  {
    slug: "fica-tax-explained",
    title: "FICA Tax Explained",
    icon: icons.shield,
  },
  {
    slug: "gross-pay-vs-net-pay",
    title: "Gross Pay vs. Net Pay",
    icon: icons.scale,
  },
  {
    slug: "states-with-no-income-tax",
    title: "The 9 States With No Income Tax",
    icon: icons.mapPin,
  },
  {
    slug: "how-to-read-a-pay-stub",
    title: "How to Read Your Pay Stub",
    icon: icons.document,
  },
  {
    slug: "additional-medicare-tax",
    title: "The Additional Medicare Tax",
    icon: icons.percentBadge,
  },
  {
    slug: "biweekly-vs-semimonthly-pay",
    title: "Biweekly vs. Semimonthly Pay",
    icon: icons.calendar,
  },
  {
    slug: "hourly-pay-estimate-guide",
    title: "Hourly Pay: Not Supported Yet",
    icon: icons.clock,
  },
];

await mkdir(outDir, { recursive: true });

for (const cover of covers) {
  const svg = buildSvg(cover);
  const outPath = path.join(outDir, `${cover.slug}.webp`);
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(outPath);
  console.log(`wrote ${outPath}`);
}

console.log(`Done: ${covers.length} covers generated.`);
