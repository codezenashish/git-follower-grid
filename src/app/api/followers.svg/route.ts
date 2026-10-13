import { NextRequest } from 'next/server';
import { createGithubClient } from '@/lib/github';
import { parseOptions, renderGrid, renderError, RequestError } from '@/lib/grid';

// Initialize github client with memory caching
const getFollowers = createGithubClient();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const options = parseOptions(url.searchParams);
    const followers = await getFollowers(options.username, options.limit);
    const svg = renderGrid(followers, options);

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    const isRequestError = error instanceof RequestError;
    const message = isRequestError
      ? error.message
      : error instanceof Error
      ? error.message
      : 'could not load followers. try again later.';

    const status = isRequestError ? error.status : 502;

    return new Response(renderError(message), {
      status,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}
