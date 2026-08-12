// Static build endpoint (this is a fully static site, no SSR adapter —
// see astro.config.mjs), so this runs once at `astro build` and bakes
// its output into dist/ads.txt. Empty adsensePublisherId -> empty body,
// which is spec-valid ("no authorized sellers declared yet") — the same
// safe-no-op convention AdSlot.astro and the BaseLayout adsense-loader
// script already follow. The moment a real publisher ID is set in
// src/config.ts, the next deploy activates this with no further code
// change. f08c47fec0942fa0 is Google's own public, non-secret AdSense
// TAG-ID constant used in every publisher's ads.txt line.
import { siteConfig } from "../config";

export const prerender = true;

export function GET() {
  const body = siteConfig.adsensePublisherId
    ? `google.com, ${siteConfig.adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`
    : "";
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
