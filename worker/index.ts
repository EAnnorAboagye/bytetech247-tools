// Route logic for the one deployed Worker's fetch() handler, falling
// through to static-asset serving for everything not explicitly handled
// here. Matches the main bytetech247.com site's "thin edge backend"
// model: this file is intentionally separate from the Astro build (the
// project stays output: 'static' — see astro.config.mjs) rather than
// adding the @astrojs/cloudflare SSR adapter. Unlike the main site, this
// Worker has no KV-backed counter endpoint and no markdown content
// negotiation — a single calculator page has no such surface yet.

export interface Env {
  ASSETS: Fetcher;
  // Set once via `wrangler secret put CSP_NONCE_SECRET` — never committed.
  // See deriveNonce() below for what it's used for.
  CSP_NONCE_SECRET: string;
}

// A real per-request-unique CSP nonce would need every HTML response
// marked uncacheable, throwing away edge caching. Deriving the nonce from
// a secret + a 5-minute time bucket instead means every request within
// the same window — cached or freshly computed — agrees on the same
// value, so caching keeps working while the nonce still rotates every 5
// minutes. Ported from the main site's worker/index.ts, same rationale.
const NONCE_WINDOW_MS = 5 * 60 * 1000;

async function deriveNonce(secret: string): Promise<string> {
  const bucket = Math.floor(Date.now() / NONCE_WINDOW_MS);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(String(bucket)),
  );
  // base64url, no padding — '+', '/', '=' aren't valid inside a CSP
  // nonce-source token unquoted from the header's perspective, and this
  // is also going straight into an HTML attribute value.
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, 32);
}

// No unsafe-eval, wasm-unsafe-eval, worker-src, or blob: — this tool is
// pure client-side arithmetic (see src/lib/paycheck-tax.ts), no WASM/eval
// dependency exists or is expected to. frame-src/img-src/connect-src
// widen to https: for AdSense's ad-serving domains, which change over
// time and don't support a static host-allowlist CSP (Google's own
// Publisher Tag docs recommend nonce + 'strict-dynamic' instead). The
// pass-through Trusted Types `default` policy is registered in
// BaseLayout.astro, not here — it's what AdSense's internal script
// injection needs, the same way it covers Astro's ClientRouter.
function cspFor(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https: http:`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' https: data:`,
    `font-src 'self'`,
    `frame-src https:`,
    `connect-src 'self' https:`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `require-trusted-types-for 'script'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

// Tags every <script> element in an HTML response with the current nonce
// and sets the matching Content-Security-Policy header. No-ops for
// non-HTML responses.
function applyCsp(response: Response, nonce: string): Response {
  if (!response.headers.get("Content-Type")?.includes("text/html")) {
    return response;
  }
  const rewritten = new HTMLRewriter()
    .on("script", {
      element(el) {
        el.setAttribute("nonce", nonce);
      },
    })
    .transform(response);
  const headers = new Headers(rewritten.headers);
  headers.set("Content-Security-Policy", cspFor(nonce));
  return new Response(rewritten.body, {
    status: rewritten.status,
    statusText: rewritten.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Computed once per request, reused at every HTML return point below
    // so a single response never mixes two different nonce values.
    const nonce = await deriveNonce(env.CSP_NONCE_SECRET);
    const response = await env.ASSETS.fetch(request);
    return applyCsp(response, nonce);
  },
};
