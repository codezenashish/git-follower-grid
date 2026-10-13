import assert from 'node:assert/strict';
import test from 'node:test';
import { createGithubClient } from '../src/lib/github';

const makePerson = (id: number) => ({ id, login: `user-${id}` });

test('githubClient: paginates past 100 followers and limits concurrency', async () => {
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;

  const getFollowers = createGithubClient({
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      calls.push(url);

      if (url.startsWith('https://api.github.com/')) {
        const page = Number(new URL(url).searchParams.get('page') || 1);
        const count = page === 1 ? 100 : 5;
        const pageData = Array.from({ length: count }, (_, i) => makePerson((page - 1) * 100 + i + 1));
        return Response.json(pageData);
      }

      // Avatar request
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      return new Response('image-bytes', {
        headers: { 'content-type': 'image/png' },
      });
    }) as typeof globalThis.fetch,
  });

  const followers = await getFollowers('octocat', 105);
  assert.equal(followers.length, 105);
  assert.equal(followers[0].login, 'user-1');
  assert.equal(followers.at(-1)?.login, 'user-105');
  assert.ok(maxActive <= 8, `Expected maxActive <= 8, got ${maxActive}`);
  assert.match(followers[0].avatar || '', /^data:image\/png;base64,/);

  // Verifies follower caching: calling again uses cached response without new API calls
  const initialApiCalls = calls.filter((u) => u.includes('api.github.com')).length;
  assert.equal(initialApiCalls, 2);
  await getFollowers('octocat', 105);
  const afterApiCalls = calls.filter((u) => u.includes('api.github.com')).length;
  assert.equal(afterApiCalls, initialApiCalls);
});

test('githubClient: handles missing user, rate limit, and upstream errors', async () => {
  // 404 user not found
  const client404 = createGithubClient({
    fetch: (async () => new Response('Not Found', { status: 404 })) as typeof globalThis.fetch,
  });
  await assert.rejects(client404('nonexistent', 10), { status: 404 });

  // 403 / 429 rate limit
  const client403 = createGithubClient({
    fetch: (async () => new Response('Rate limited', { status: 403 })) as typeof globalThis.fetch,
  });
  await assert.rejects(client403('octocat', 10), { status: 503 });

  // 500 upstream server error
  const client500 = createGithubClient({
    fetch: (async () => new Response('Server error', { status: 500 })) as typeof globalThis.fetch,
  });
  await assert.rejects(client500('octocat', 10), { status: 502 });
});

test('githubClient: caps avatar size and deduplicates in-flight calls', async () => {
  let apiCalls = 0;
  let avatarCalls = 0;

  const client = createGithubClient({
    fetch: (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('api.github.com')) {
        apiCalls++;
        return Response.json([makePerson(1)]);
      }
      avatarCalls++;
      // oversized image (>256KB)
      return new Response(new Uint8Array(300 * 1024), {
        headers: { 'content-type': 'image/png' },
      });
    }) as typeof globalThis.fetch,
  });

  const [first, second] = await Promise.all([client('octocat', 1), client('octocat', 1)]);
  assert.equal(apiCalls, 1, 'In-flight API call should be deduplicated');
  assert.equal(avatarCalls, 1, 'In-flight avatar call should be deduplicated');
  assert.equal(first[0].avatar, null, 'Oversized avatar should fall back to null');
  assert.deepEqual(first, second);
});
