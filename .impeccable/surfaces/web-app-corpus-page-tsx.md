---
version: 1
slug: 'web-app-corpus-page-tsx'
primary_target: 'web/app/corpus/page.tsx'
related_targets: ['web/components/corpus']
---

# Surface: corpus browser (`/corpus`)

Scope: the 35 articles every answer comes from, each shown as the searches see it. Visitor mode: **Read**, with two Operate controls (article, chunk size), both kept in the URL (`?doc=&chunks=`).

- Job: see that retrieval works on chunks, not articles, and where the chunk boundaries fall at each size.
- Content: `/api/corpus/documents` and `/api/corpus/documents/{id}`; no model calls, no cost.
- Honesty: the legend states whether this article at this size has any overlapping text; the shading appears only where it is true.
- Mobile: a native select replaces the list; the text reflows; markers are inline and never force horizontal scroll.
