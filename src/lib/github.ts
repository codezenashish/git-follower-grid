import { RequestError, type FollowerItem } from './grid';

interface CacheEntry<T> {
  value: Promise<T>;
  expires: number;
}

function createCache<T>(maxEntries: number, ttlMs: number) {
  const entries = new Map<string, CacheEntry<T>>();

  return (key: string, load: () => Promise<T>): Promise<T> => {
    const existing = entries.get(key);
    if (existing && existing.expires > Date.now()) {
      return existing.value;
    }
    entries.delete(key);
    if (entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey !== undefined) {
        entries.delete(oldestKey);
      }
    }

    const value = Promise.resolve().then(load).catch((error) => {
      if (entries.get(key)?.value === value) {
        entries.delete(key);
      }
      throw error;
    });

    entries.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  };
}

interface GitHubUserRaw {
  login: string;
  id: number;
  avatar_url?: string;
}

export function createGithubClient({ fetch: customFetch = globalThis.fetch }: { fetch?: typeof globalThis.fetch } = {}) {
  // Follower cache for 1 hour, avatar cache for 24 hours
  const followerCache = createCache<GitHubUserRaw[]>(200, 60 * 60 * 1000);
  const avatarCache = createCache<string | null>(1000, 24 * 60 * 60 * 1000);

  const getHeaders = () => {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'git-follower-grid/1.0',
    };
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  async function fetchFollowerPage(username: string, page: number): Promise<GitHubUserRaw[]> {
    const res = await customFetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/followers?per_page=100&page=${page}`,
      {
        headers: getHeaders(),
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      }
    );

    if (res.status === 404) {
      throw new RequestError('github user not found.', 404);
    }
    if (res.status === 403 || res.status === 429) {
      const resetTime = res.headers.get('x-ratelimit-reset');
      const resetMsg = resetTime ? ` (resets at ${new Date(Number(resetTime) * 1000).toLocaleTimeString()})` : '';
      throw new RequestError(`github rate limit reached. try again later${resetMsg}.`, 503);
    }
    if (!res.ok) {
      throw new RequestError('github is unavailable. try again later.', 502);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.some((person) => !person || typeof person.login !== 'string')) {
      throw new RequestError('github returned an invalid response.', 502);
    }

    return data as GitHubUserRaw[];
  }

  async function fetchAvatar(id: number): Promise<string | null> {
    if (!Number.isSafeInteger(id) || id < 1) return null;

    try {
      const res = await customFetch(`https://avatars.githubusercontent.com/u/${id}?s=96&v=4`, {
        signal: AbortSignal.timeout(5_000),
        redirect: 'error',
      });

      const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || '';
      if (!res.ok || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(contentType)) {
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 256 * 1024) {
        return null; // avatar file too large
      }

      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  return async (username: string, limit: number): Promise<FollowerItem[]> => {
    const pages: GitHubUserRaw[] = [];
    for (let page = 1; pages.length < limit; page++) {
      const data = await followerCache(`${username}:${page}`, () => fetchFollowerPage(username, page));
      pages.push(...data);
      if (data.length < 100) break;
    }

    const people = pages.slice(0, limit);
    const result: FollowerItem[] = new Array(people.length);
    let cursor = 0;

    const concurrency = Math.min(8, people.length);
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (cursor < people.length) {
          const index = cursor++;
          const person = people[index];
          const avatar = await avatarCache(String(person.id), () => fetchAvatar(person.id)).catch(() => null);
          result[index] = {
            login: person.login,
            avatar,
          };
        }
      })
    );

    return result;
  };
}

export type GithubClient = ReturnType<typeof createGithubClient>;
