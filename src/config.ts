export const siteConfig = {
  name: "ByteTech247 Tools",
  url: "https://paycheckcalculator.bytetech247.com",
  description:
    "Fast, honest personal finance calculators. Every figure sourced, every estimate labeled — no forced signup, no fingerprinting.",

  // Receive-only mailbox (Cloudflare Email Routing forwards to the
  // owner's inbox) — used as a plain mailto: link, no contact-form
  // backend exists or is needed for that.
  contactEmail: "paycheckcalculator@bytetech247.com",

  // Single source of truth for Header/Footer nav so both stay in sync
  // as pages are renamed or added — no hrefs hardcoded twice.
  nav: [
    { href: "/", label: "Calculator" },
    { href: "/blog", label: "Blog" },
    { href: "/faq", label: "FAQ" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ] as { href: string; label: string }[],

  // Byline/JSON-LD author for every blog post.
  authorName: "Aboagye Annor",

  // GA4 Measurement ID for this property specifically (not shared with
  // the main bytetech247.com site or any other tool subdomain). Empty
  // string is a safe no-op — BaseLayout only renders the gtag.js loader
  // when this is set, same convention as adsensePublisherId below.
  gaMeasurementId: "G-4RDZXGQ56R",

  adsensePublisherId: "ca-pub-2225877475261768",

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
    blogPostTop: "",
    blogPostBottom: "",
  } as Record<string, string>,
};
