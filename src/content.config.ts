import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // Placeholder date on stubs; must be corrected to the real publish
      // date the same time `draft` flips to false.
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      // Fail-closed default: an accidentally-omitted `draft` field hides a
      // post rather than accidentally publishing an empty stub.
      draft: z.boolean().default(true),
      // Internal content-ops metadata only — never rendered on the page.
      targetKeyword: z.string(),
      wave: z.number().int().min(1).max(3),
      // image() resolves a relative path through Astro's asset pipeline —
      // <Image> then serves it as an optimized, compressed WebP with real
      // width/height (CLS-safe) at build time. Required, not optional:
      // every post needs a cover for social sharing and Article rich
      // results (Google's structured data guidelines list `image` as
      // required for Article/BlogPosting eligibility).
      heroImage: image(),
      heroImageAlt: z.string(),
    }),
});

export const collections = { blog };
