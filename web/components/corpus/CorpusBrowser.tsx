'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Notice } from '@/components/site/Notice';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Typography } from '@/components/ui/Typography';
import { CORPUS } from '@/content/corpus';
import {
  type CorpusDocument,
  type CorpusDocuments,
  fetchCorpusDocument,
  fetchCorpusDocuments,
} from '@/lib/api';
import { cn } from '@/lib/utils';

import { ArticleText } from './ArticleText';

const DEFAULT_CHUNK_SET = 'medium';

type Selection = { docId: number; chunkSet: string };

type Load<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

// ?doc=<id>&chunks=<set>, so an article and a chunk size can be shared by link.
const readSelection = (search: string, list: CorpusDocuments): Selection => {
  const params = new URLSearchParams(search);
  const docId = Number(params.get('doc'));
  const chunkSet = params.get('chunks') ?? '';
  return {
    docId: list.documents.some((d) => d.id === docId) ? docId : list.documents[0].id,
    chunkSet: list.chunk_sets.some((s) => s.name === chunkSet) ? chunkSet : DEFAULT_CHUNK_SET,
  };
};

// The selected chunk set always comes from the list, so its sizes are always there.
const chunkSet = (list: CorpusDocuments, doc: CorpusDocument) =>
  list.chunk_sets.find((s) => s.name === doc.chunk_set)!;

const summary = (list: CorpusDocuments, doc: CorpusDocument) => {
  const set = chunkSet(list, doc);
  return CORPUS.articleSummary(doc.chunks.length, set.target_tokens, set.overlap_tokens);
};

const hrefFor = ({ docId, chunkSet }: Selection) => `?doc=${docId}&chunks=${chunkSet}`;

// Sheet 3: the articles every answer comes from, each shown the way the searches see it.
const CorpusBrowser = () => {
  const [list, setList] = useState<Load<CorpusDocuments>>({ status: 'loading' });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [article, setArticle] = useState<Load<CorpusDocument>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedId = selection?.docId;

  // Keep the chosen article in view in the scrolling list (a linked one can be far down).
  useEffect(() => {
    listRef.current?.querySelector('[data-current]')?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCorpusDocuments(controller.signal)
      .then((data) => {
        setList({ status: 'ready', data });
        setSelection(readSelection(window.location.search, data));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setList({ status: 'error', message: message(error) });
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!selection) return;
    const controller = new AbortController();
    fetchCorpusDocument(selection.docId, selection.chunkSet, controller.signal)
      .then((data) => setArticle({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setArticle({ status: 'error', message: message(error) });
      });
    return () => controller.abort();
  }, [selection]);

  const choose = useCallback((next: Selection) => {
    setArticle({ status: 'loading' });
    setSelection(next);
    window.history.replaceState(null, '', hrefFor(next));
  }, []);

  const retry = () => {
    setList({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-4">
        <Typography variant="sheetTitle" id="sheet-title">
          <span className="voice-data mr-3 align-[0.2em] text-sm font-normal tracking-normal text-muted-foreground">
            {CORPUS.sheetLabel} ·
          </span>
          {CORPUS.title}
        </Typography>
        <Typography color="muted" className="max-w-[68ch]">
          {CORPUS.lede}
        </Typography>
      </header>

      {list.status === 'loading' && <Notice tone="note">{CORPUS.loading}</Notice>}
      {list.status === 'error' && (
        <Notice tone="error">
          <p>{CORPUS.error(list.message)}</p>
          <Button variant="pencil" size="inline" className="mt-1" onClick={retry}>
            {CORPUS.retry}
          </Button>
        </Notice>
      )}

      {list.status === 'ready' && selection && (
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Typography variant="label" color="muted" as="p" id="chunk-size-label">
                {CORPUS.chunkSizeLabel}
              </Typography>
              <SegmentedControl
                name="corpus-chunks"
                labelledBy="chunk-size-label"
                options={list.data.chunk_sets.map((s) => ({ value: s.name, label: s.name }))}
                value={selection.chunkSet}
                onChange={(chunkSet) => choose({ ...selection, chunkSet })}
              />
            </div>

            <label className="block space-y-1.5 lg:hidden">
              <Typography variant="label" color="muted" as="span" className="block">
                {CORPUS.articlesLabel}
              </Typography>
              <select
                value={selection.docId}
                onChange={(e) => choose({ ...selection, docId: Number(e.target.value) })}
                className="h-11 w-full rounded-sm border border-input bg-card px-3 text-base"
              >
                {list.data.documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>

            <nav aria-label={CORPUS.articlesLabel} className="hidden lg:sticky lg:top-4 lg:block">
              <Typography variant="label" color="muted" as="p">
                {CORPUS.articleCount(list.data.documents.length)}
              </Typography>
              <ul
                ref={listRef}
                className="mt-1.5 max-h-[calc(100vh-10rem)] space-y-0.5 overflow-y-auto border-b pr-1 pb-1"
              >
                {list.data.documents.map((d) => {
                  const current = d.id === selection.docId;
                  return (
                    <li key={d.id}>
                      <a
                        href={hrefFor({ ...selection, docId: d.id })}
                        aria-current={current ? 'page' : undefined}
                        data-current={current || undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          choose({ ...selection, docId: d.id });
                        }}
                        className={cn(
                          'block rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                          current && 'bg-accent font-semibold text-primary',
                        )}
                      >
                        {d.title}
                        <span className="voice-data block text-xs font-normal text-muted-foreground">
                          {CORPUS.listMeta(d.chunks[selection.chunkSet] ?? 0, d.chars)}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <article
            aria-labelledby="article-title"
            aria-busy={article.status === 'loading'}
            className="min-w-0 rounded-md border bg-card px-4 py-4 md:px-6"
          >
            {article.status === 'loading' && (
              <Typography variant="small" color="muted">
                {CORPUS.loadingArticle}
              </Typography>
            )}
            {article.status === 'error' && (
              <Notice tone="error">{CORPUS.error(article.message)}</Notice>
            )}
            {article.status === 'ready' && (
              <>
                <header className="space-y-1 border-b border-dashed pb-3">
                  <Typography variant="stepHeading" as="h2" id="article-title">
                    {article.data.title}
                  </Typography>
                  <Typography variant="small" color="muted">
                    {summary(list.data, article.data)}{' '}
                    <a
                      href={article.data.source_url}
                      className="text-primary underline underline-offset-4"
                    >
                      {CORPUS.source}
                    </a>
                  </Typography>
                </header>
                <div className="mt-3">
                  <ArticleText
                    doc={article.data}
                    overlapTokens={chunkSet(list.data, article.data).overlap_tokens}
                  />
                </div>
              </>
            )}
          </article>
        </div>
      )}
    </div>
  );
};

export { CorpusBrowser };
