export const siteConfig = {
  name: "ByteTech247 Tools",
  url: "https://tools.bytetech247.com",
  description:
    "Fast, honest personal finance calculators. Every figure sourced, every estimate labeled — no forced signup, no fingerprinting.",

  // Empty until this property is actually approved in AdSense — same
  // "ca-" prefix requirement as the main site once a real ID exists.
  adsensePublisherId: "",

  // Manual AdSense ad-unit slot IDs (Ads -> By ad unit -> Display ads),
  // same convention as the main bytetech247.com site: AdSlot.astro
  // renders nothing for an empty string, so this is a safe no-op rather
  // than a broken ad tag. Left empty until this property is connected/
  // approved in AdSense — the main site enabled real slot IDs before
  // approval once and it wrecked Lighthouse mobile performance (score
  // 0.35, LCP 5.6s) because every ad request was pure overhead with no
  // chance of filling. Don't repeat that here.
  adSlots: {
    header: "",
    afterResults: "",
    sidebar: "",
    beforeMethodology: "",
  } as Record<string, string>,
};
