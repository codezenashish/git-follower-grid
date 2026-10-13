export class RequestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

export interface GridOptions {
  username: string;
  cols: number;
  width: number;
  limit: number;
  gap: number;
  shape: 'circle' | 'rounded' | 'square';
}

export interface FollowerItem {
  login: string;
  avatar: string | null;
}

export function parseOptions(params: URLSearchParams): GridOptions {
  const username = (params.get('username') ?? '').trim().toLowerCase();
  if (!username) {
    throw new RequestError('enter a valid github username.');
  }

  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/.test(username)) {
    throw new RequestError('enter a valid github username.');
  }

  const parseNumber = (name: string, fallback: number, min: number, max: number): number => {
    const raw = params.get(name);
    if (raw === null || raw === '') return fallback;
    if (!/^\d+$/.test(raw)) {
      throw new RequestError(`${name} must be a whole number from ${min} to ${max}.`);
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new RequestError(`${name} must be a whole number from ${min} to ${max}.`);
    }
    return value;
  };

  const rawShape = (params.get('shape') ?? 'rounded').toLowerCase();
  const shape = (['circle', 'rounded', 'square'].includes(rawShape)
    ? rawShape
    : 'rounded') as GridOptions['shape'];

  const options: GridOptions = {
    username,
    cols: parseNumber('cols', 8, 1, 20),
    width: parseNumber('width', 640, 160, 1600),
    limit: parseNumber('limit', 40, 1, 200),
    gap: parseNumber('gap', 8, 0, 32),
    shape,
  };

  if ((options.width - (options.cols - 1) * options.gap) / options.cols < 16) {
    throw new RequestError('avatars need at least 16px. increase width or reduce columns / gap.');
  }

  return options;
}

export const escapeXml = (value: string | number): string =>
  String(value).replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return char;
    }
  });

export function renderGrid(followers: FollowerItem[], options: GridOptions): string {
  const { username, cols, width, gap, limit, shape } = options;
  const visible = followers.slice(0, limit);
  const size = Math.floor((width - (cols - 1) * gap) / cols);
  const rows = Math.ceil(visible.length / cols);
  const height = rows ? rows * size + (rows - 1) * gap : 64;
  const radius = shape === 'circle' ? size / 2 : shape === 'rounded' ? Math.round(size * 0.18) : 0;

  const cells = visible
    .map(({ login, avatar }, index) => {
      const x = (index % cols) * (size + gap);
      const y = Math.floor(index / cols) * (size + gap);
      const initial = escapeXml((login.slice(0, 1) || '?').toUpperCase());
      const safeLogin = escapeXml(login);

      return `<g transform="translate(${x} ${y})">` +
        `<title>${safeLogin}</title>` +
        `<clipPath id="avatar-${index}">` +
        `<rect width="${size}" height="${size}" rx="${radius}"/>` +
        `</clipPath>` +
        `<g clip-path="url(#avatar-${index})">` +
        `<rect width="${size}" height="${size}" fill="#e2e9e4"/>` +
        `<text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="${Math.round(size * 0.38)}" fill="#35583f">${initial}</text>` +
        (avatar ? `<image width="${size}" height="${size}" href="${escapeXml(avatar)}" xlink:href="${escapeXml(avatar)}" preserveAspectRatio="xMidYMid slice"/>` : '') +
        `</g>` +
        `</g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">` +
    `<title id="title">${escapeXml(username)}'s github followers</title>` +
    `<desc id="description">${visible.length} followers shown in ${cols} columns. ${visible.map(({ login }) => escapeXml(login)).join(', ')}</desc>` +
    (cells || `<text x="${width / 2}" y="38" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#6b806f">no public followers.</text>`) +
    `</svg>`;
}

export function renderError(message: string): string {
  const safeMsg = escapeXml(message);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="64" viewBox="0 0 640 64" role="img">` +
    `<title>${safeMsg}</title>` +
    `<rect width="640" height="64" rx="8" fill="#fff0ee" stroke="#fecaca" stroke-width="1"/>` +
    `<text x="16" y="37" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#9c3025">${safeMsg}</text>` +
    `</svg>`;
}
