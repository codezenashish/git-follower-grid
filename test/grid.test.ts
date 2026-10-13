import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOptions, renderGrid, renderError, RequestError } from '../src/lib/grid';

const makeOptions = (query = '') => parseOptions(new URLSearchParams(`username=octocat&${query}`));
const makePerson = (id: number) => ({ login: `user-${id}`, avatar: null });

test('parseOptions: validates query bounds and rejects injection before network access', () => {
  const defaults = makeOptions();
  assert.equal(defaults.username, 'octocat');
  assert.equal(defaults.cols, 8);
  assert.equal(defaults.width, 640);
  assert.equal(defaults.limit, 40);
  assert.equal(defaults.gap, 8);
  assert.ok(['circle', 'rounded'].includes(defaults.shape));

  // Invalid usernames
  for (const query of ['username=../x', 'username=a--b', 'username=a-', 'username=', 'username=' + 'a'.repeat(40)]) {
    assert.throws(() => parseOptions(new URLSearchParams(query)), RequestError);
  }

  // Out of bound numbers
  for (const query of ['cols=0', 'cols=2.5', 'cols=2e1', 'width=9000', 'width=160&cols=20', 'limit=201', 'limit=-1', 'gap=-1', 'gap=50']) {
    assert.throws(() => makeOptions(query), RequestError);
  }

  // Minimum avatar size check (< 16px)
  assert.throws(() => makeOptions('width=160&cols=10&gap=8'), RequestError);
});

test('renderGrid: respects dimensions, order, limits, shape, and XML escaping', () => {
  const sampleFollowers = [
    { login: '<&"', avatar: 'data:image/png;base64,AA==' },
    ...Array.from({ length: 8 }, (_, i) => makePerson(i + 1)),
  ];

  const opts = makeOptions('cols=3&width=320&limit=4&gap=10&shape=rounded');
  const svg = renderGrid(sampleFollowers, opts);

  assert.match(svg, /width="320"/);
  assert.match(svg, /viewBox="0 0 320 \d+"/);
  assert.match(svg, /&lt;&amp;&quot;/);
  assert.equal((svg.match(/<clipPath /g) || []).length, 4);
  assert.match(svg, /data:image\/png;base64,AA==/);
  assert.match(svg, /xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/);
  assert.match(svg, /xlink:href="data:image\/png;base64,AA=="/);
  assert.doesNotMatch(svg, /<script|<foreignObject|href="https:/);

  // Empty followers
  const emptySvg = renderGrid([], makeOptions());
  assert.match(emptySvg, /no public followers/);
});

test('renderGrid: handles shapes correctly (circle, rounded, square)', () => {
  const people = [makePerson(1)];
  const circleSvg = renderGrid(people, makeOptions('shape=circle&cols=1&width=200&gap=0'));
  assert.match(circleSvg, /rx="100"/);

  const squareSvg = renderGrid(people, makeOptions('shape=square&cols=1&width=200&gap=0'));
  assert.match(squareSvg, /rx="0"/);
});

test('renderError: produces safe escaped error card', () => {
  const errorSvg = renderError('<bad>&"danger"');
  assert.match(errorSvg, /&lt;bad&gt;&amp;&quot;danger&quot;/);
  assert.doesNotMatch(errorSvg, /<script|<bad>/);
});
