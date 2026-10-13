'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MorphIcon } from 'morphicons/react';
import { Sun, Moon, Copy, Check } from 'lucide';
import { Download, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

type ShapeType = 'circle' | 'rounded' | 'square';

export default function Home() {
  // Form input states
  const [username, setUsername] = useState('octocat');
  const [cols, setCols] = useState(8);
  const [width, setWidth] = useState(640);
  const [limit, setLimit] = useState(40);
  const [gap, setGap] = useState(8);
  const [shape, setShape] = useState<ShapeType>('circle');

  // Preview & Canvas states
  const [canvasDark, setCanvasDark] = useState(false);
  const [isSiteDark, setIsSiteDark] = useState(false);
  const [copied, setCopied] = useState(false);

  // Applied options state for API call
  const [appliedOptions, setAppliedOptions] = useState({
    username: 'octocat',
    cols: 8,
    width: 640,
    limit: 40,
    gap: 8,
    shape: 'circle' as ShapeType,
  });

  // SVG result and metadata status
  const [svgContent, setSvgContent] = useState<string>('');
  const [svgBlobUrl, setSvgBlobUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<{ width: number; height: number; followersCount: number } | null>(null);

  const [, startTransition] = useTransition();

  // Load URL query parameters on initial load if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const u = params.get('username');
    const c = params.get('cols');
    const w = params.get('width');
    const l = params.get('limit');
    const g = params.get('gap');
    const s = params.get('shape');

    const nextUsername = u || 'octocat';
    const nextCols = c && !isNaN(Number(c)) ? Number(c) : 8;
    const nextWidth = w && !isNaN(Number(w)) ? Number(w) : 640;
    const nextLimit = l && !isNaN(Number(l)) ? Number(l) : 40;
    const nextGap = g && !isNaN(Number(g)) ? Number(g) : 8;
    const nextShape = (s && ['circle', 'rounded', 'square'].includes(s) ? s : 'circle') as ShapeType;

    setUsername(nextUsername);
    setCols(nextCols);
    setWidth(nextWidth);
    setLimit(nextLimit);
    setGap(nextGap);
    setShape(nextShape);

    setAppliedOptions({
      username: nextUsername,
      cols: nextCols,
      width: nextWidth,
      limit: nextLimit,
      gap: nextGap,
      shape: nextShape,
    });
  }, []);

  // Sync document dark mode
  useEffect(() => {
    if (isSiteDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isSiteDark]);

  // Generate API URL
  const queryParams = new URLSearchParams({
    username: appliedOptions.username.trim() || 'octocat',
    cols: String(appliedOptions.cols),
    width: String(appliedOptions.width),
    limit: String(appliedOptions.limit),
    gap: String(appliedOptions.gap),
    shape: appliedOptions.shape,
  }).toString();

  const getFullApiUrl = useCallback(() => {
    const customSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
    if (customSiteUrl) {
      return `${customSiteUrl}/api/followers.svg?${queryParams}`;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/followers.svg?${queryParams}`;
    }
    return `/api/followers.svg?${queryParams}`;
  }, [queryParams]);

  const fullApiUrl = typeof window !== 'undefined' ? getFullApiUrl() : `/api/followers.svg?${queryParams}`;

  // Fetch SVG from API
  const fetchSvg = useCallback(async (opts = appliedOptions) => {
    const cleanUser = opts.username.trim();
    if (!cleanUser) {
      setErrorMsg('enter a valid github username.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const params = new URLSearchParams({
      username: cleanUser,
      cols: String(opts.cols),
      width: String(opts.width),
      limit: String(opts.limit),
      gap: String(opts.gap),
      shape: opts.shape,
    }).toString();

    try {
      const res = await fetch(`/api/followers.svg?${params}`);
      const text = await res.text();

      if (!res.ok) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const titleEl = doc.querySelector('title');
        throw new Error(titleEl?.textContent || 'could not load followers.');
      }

      setSvgContent(text);

      const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      setSvgBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return blobUrl;
      });

      // Parse dimensions and follower count
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const rootSvg = doc.documentElement;
      const parsedH = Math.round(Number(rootSvg.getAttribute('height')) || 0);
      const followerCount = doc.querySelectorAll('clipPath').length;

      setStats({
        width: opts.width,
        height: parsedH,
        followersCount: followerCount,
      });

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `?${params}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'could not load followers.';
      setErrorMsg(msg);
      setSvgContent('');
    } finally {
      setIsLoading(false);
    }
  }, [appliedOptions]);

  // Initial load fetch
  useEffect(() => {
    fetchSvg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update button handler
  const handleUpdate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newOptions = {
      username: username.trim() || 'octocat',
      cols: Number(cols) || 8,
      width: Number(width) || 640,
      limit: Number(limit) || 40,
      gap: Number(gap) || 8,
      shape,
    };
    setAppliedOptions(newOptions);
    startTransition(() => {
      fetchSvg(newOptions);
    });
  };

  // Markdown snippet
  const markdownCode = `[![${appliedOptions.username}'s github followers](${fullApiUrl})](https://github.com/${appliedOptions.username}?tab=followers)`;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdownCode);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = markdownCode;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    }
  };

  const handleDownload = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${appliedOptions.username}-followers.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-foreground/10 selection:text-foreground">
      {/* Main Container - max-w-3xl */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Top Header Row with title and dark theme toggle */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <h1 className="heading lowercase tracking-tight">
              github followers
            </h1>
            <span className="small-text font-mono">· readme grid</span>
          </div>

          <button
            type="button"
            onClick={() => setIsSiteDark((o) => !o)}
            aria-expanded={isSiteDark}
            aria-label={isSiteDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isSiteDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/60 bg-background/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <MorphIcon icon={isSiteDark ? Sun : Moon} size={15} />
          </button>
        </div>
        {/* Controls Form */}
        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Row 1: github username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="small-text lowercase">
              github username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={39}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              placeholder="octocat"
              className="h-11 bg-muted/40 border-border text-foreground font-medium rounded-md focus-visible:ring-1 focus-visible:ring-foreground/40"
            />
          </div>

          {/* Row 2: columns, width (px), limit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cols" className="small-text lowercase">
                columns
              </Label>
              <Input
                id="cols"
                type="number"
                min={1}
                max={20}
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                required
                className="h-11 bg-muted/40 border-border text-foreground font-medium rounded-md focus-visible:ring-1 focus-visible:ring-foreground/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="width" className="small-text lowercase">
                width (px)
              </Label>
              <Input
                id="width"
                type="number"
                min={160}
                max={1600}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                required
                className="h-11 bg-muted/40 border-border text-foreground font-medium rounded-md focus-visible:ring-1 focus-visible:ring-foreground/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="limit" className="small-text lowercase">
                limit
              </Label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                required
                className="h-11 bg-muted/40 border-border text-foreground font-medium rounded-md focus-visible:ring-1 focus-visible:ring-foreground/40"
              />
            </div>
          </div>

          {/* Row 3: gap (px), shape, update preview button */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="gap" className="small-text lowercase">
                gap (px)
              </Label>
              <Input
                id="gap"
                type="number"
                min={0}
                max={32}
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
                required
                className="h-11 bg-muted/40 border-border text-foreground font-medium rounded-md focus-visible:ring-1 focus-visible:ring-foreground/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shape" className="small-text lowercase">
                shape
              </Label>
              <Select
                id="shape"
                value={shape}
                onChange={(e) => setShape(e.target.value as ShapeType)}
                className="h-11 bg-muted/40 border-border text-foreground font-medium rounded-md focus-visible:ring-1 focus-visible:ring-foreground/40"
              >
                <option value="circle">circle</option>
                <option value="rounded">rounded</option>
                <option value="square">square</option>
              </Select>
            </div>

            {/* Update Preview Button - Neutral, premium monochrome styling */}
            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 font-medium rounded-md transition-all shadow-xs disabled:opacity-50 lowercase cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    <span>loading…</span>
                  </>
                ) : (
                  <span>update preview</span>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Preview Section */}
        <section aria-label="preview" className="space-y-3 pt-2">
          {/* Header with 'preview' on left and 'dark background' on right */}
          <div className="flex items-center justify-between">
            <h2 className="subheading text-foreground font-semibold lowercase tracking-tight">
              preview
            </h2>
            <button
              type="button"
              onClick={() => setCanvasDark(!canvasDark)}
              className="small-text hover:text-foreground transition-colors cursor-pointer select-none lowercase"
            >
              {canvasDark ? 'light background' : 'dark background'}
            </button>
          </div>

          {/* Follower Grid Canvas */}
          <div
            className={`rounded-lg p-6 min-h-[220px] flex items-center justify-center overflow-x-auto transition-colors duration-200 border border-border/60 ${
              canvasDark
                ? 'bg-[#0d1117] text-white shadow-inner'
                : 'bg-muted/20 text-neutral-900'
            }`}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin opacity-70" />
                <span className="small-text lowercase font-mono">loading followers…</span>
              </div>
            ) : errorMsg ? (
              <div className="flex items-center gap-2 small-text text-destructive py-8">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMsg}</span>
              </div>
            ) : svgBlobUrl ? (
              <div className="max-w-full overflow-auto flex justify-center py-1">
                <img
                  src={svgBlobUrl}
                  alt={`${appliedOptions.username}'s github followers`}
                  className="max-w-none transition-all duration-200"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            ) : (
              <div className="small-text py-12 lowercase">
                preview unavailable.
              </div>
            )}
          </div>

          {/* Caption row below preview: dimensions on left, download svg on right */}
          <div className="flex items-center justify-between small-text font-mono pt-1">
            <span>
              {stats && !errorMsg ? `${stats.width} × ${stats.height}px · ${stats.followersCount} followers` : ''}
            </span>

            {svgContent && !errorMsg && (
              <div className="flex items-center gap-3">
                <a
                  href={fullApiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="small-text hover:text-foreground transition-colors inline-flex items-center gap-1 font-sans lowercase"
                  title="Open SVG in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>open</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="small-text text-foreground hover:underline transition-all inline-flex items-center gap-1 font-sans lowercase cursor-pointer font-medium"
                >
                  <Download className="h-3 w-3" />
                  <span>download svg</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Markdown Section */}
        <section aria-label="markdown" className="space-y-2 pt-2">
          {/* Header with 'markdown' on left and icon-only 'copy' button on right */}
          <div className="flex items-center justify-between">
            <h2 className="subheading text-foreground font-semibold lowercase tracking-tight">
              markdown
            </h2>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy markdown'}
              title={copied ? 'Copied' : 'Copy markdown'}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/60 bg-background/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring select-none"
            >
              <MorphIcon
                icon={copied ? Check : Copy}
                size={15}
                className={copied ? 'text-emerald-500 transition-colors' : 'transition-colors'}
              />
            </button>
          </div>

          {/* Markdown Textarea */}
          <Textarea
            readOnly
            value={markdownCode}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            rows={4}
            spellCheck={false}
            className="w-full bg-muted/40 border-border text-foreground text-xs font-mono rounded-md p-3 leading-relaxed resize-none focus-visible:ring-1 focus-visible:ring-foreground/40"
          />

          {typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) && (
            <p className="text-[11px] text-muted-foreground/80 font-mono pt-1">
              💡 note: localhost links only work on your machine. deploy to vercel or a public domain to use in your github readme.
            </p>
          )}
        </section>

        {/* Minimal Footer */}
        <footer className="pt-8 border-t border-border/40 text-center small-text font-mono">
          <p>
            github follower grid · dynamic svg generator
          </p>
        </footer>
      </main>
    </div>
  );
}