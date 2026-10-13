import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/followers.svg/route';

test('GET /api/followers.svg: returns 400 when missing username', async () => {
  const req = new NextRequest('http://localhost:3000/api/followers.svg');
  const res = await GET(req);
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('content-type'), 'image/svg+xml; charset=utf-8');
  assert.equal(res.headers.get('cache-control'), 'no-store, max-age=0');
  const text = await res.text();
  assert.match(text, /enter a valid github username/);
});

test('GET /api/followers.svg: returns 400 on invalid query params', async () => {
  const req = new NextRequest('http://localhost:3000/api/followers.svg?username=octocat&cols=0');
  const res = await GET(req);
  assert.equal(res.status, 400);
  const text = await res.text();
  assert.match(text, /cols must be a whole number/);
});

test('GET /api/followers.svg: headers include security and caching options', async () => {
  const req = new NextRequest('http://localhost:3000/api/followers.svg?username=invalid_user_!@#$');
  const res = await GET(req);
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('content-type'), 'image/svg+xml; charset=utf-8');
});
