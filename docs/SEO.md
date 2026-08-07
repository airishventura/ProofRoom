# SEO & Metadata

## Implemented
- Title tag with primary keyword: "ProofRoom — Verifiable AI Workspace"
- Meta description (155 chars): includes due diligence, verified AI, audit, approval, publish
- Keywords: AI workspace, due diligence, verified AI, audit trail, document workspace, client reports, private endpoint, approval controls
- Canonical URL: https://proofroom.app/
- Open Graph (og:type, og:title, og:description, og:url, og:image, og:site_name)
- Twitter Card (summary_large_image) with creator tag
- Schema.org SoftwareApplication JSON-LD with feature list, offers, provider
- Robots meta: index, follow
- Sitemap reference (`public/sitemap.xml` with 5 URLs, priorities)
- Robots.txt (`public/robots.txt` with sitemap and disallow rules)
- Preconnect for fonts
- Semantic HTML5 (`nav`, `main`, `section`, `header`, `footer`)

## Ahrefs-Ready
- Structured heading hierarchy (H1 per page, H2 sections)
- Internal linking across all 5 pages
- Alt text implied by image context (cards describe features)
- Fast load (CSS-in-JS, minimal external assets)
- Mobile responsive layout
- HTTPS implied (canonical + sitemap use https://)

## Remaining for Production SEO
- Add `og:image` asset (`/public/og-preview.png`)
- Add `hreflang` if multi-language needed
- Generate actual meta descriptions per page (currently shared)
- Add breadcrumbs schema per page
- Submit sitemap to Google Search Console / Bing Webmaster Tools
