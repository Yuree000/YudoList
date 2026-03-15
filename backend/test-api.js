const { randomUUID } = require('node:crypto');

const baseUrl = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
let pass = 0;
let fail = 0;

function check(label, condition, details = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
    pass += 1;
    return;
  }

  console.log(`  FAIL  ${label}${details ? ` (${details})` : ''}`);
  fail += 1;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: response.status, body, text };
}

async function main() {
  const suffix = randomUUID().slice(0, 8);
  const userA = {
    username: `apitest_${suffix}`,
    email: `apitest_${suffix}@test.dev`,
    password: 'secret123',
  };
  const userB = {
    username: `apitest_b_${suffix}`,
    email: `apitest_b_${suffix}@test.dev`,
    password: 'secret123',
  };

  console.log('=== YudoList API Tests ===');
  console.log(`Base URL: ${baseUrl}`);
  console.log();

  let response = await request('/health');
  check('GET /health', response.status === 200 && response.body?.status === 'ok', `status=${response.status}`);

  response = await request('/api/v1/health');
  check(
    'GET /api/v1/health',
    response.status === 200 && response.body?.status === 'ok',
    `status=${response.status}`,
  );

  response = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userA),
  });
  check(
    'POST /auth/register',
    response.status === 201 &&
      response.body?.data?.token &&
      response.body?.data?.user?.email === userA.email,
    `status=${response.status}`,
  );
  const tokenA = response.body?.data?.token;
  const itemOwnerId = response.body?.data?.user?.id;

  response = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userA),
  });
  check(
    'POST /auth/register (duplicate)',
    response.status === 409 && response.body?.error === 'CONFLICT',
    `status=${response.status}`,
  );

  response = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userA.email, password: userA.password }),
  });
  check(
    'POST /auth/login',
    response.status === 200 &&
      response.body?.data?.token &&
      response.body?.data?.user?.id === itemOwnerId,
    `status=${response.status}`,
  );

  response = await request('/auth/profile');
  check(
    'GET /auth/profile (no token)',
    response.status === 401 && response.body?.error === 'UNAUTHORIZED',
    `status=${response.status}`,
  );

  response = await request('/auth/profile', { headers: authHeaders(tokenA) });
  check(
    'GET /auth/profile',
    response.status === 200 && response.body?.data?.email === userA.email,
    `status=${response.status}`,
  );

  response = await request('/items', { headers: authHeaders(tokenA) });
  check(
    'GET /items (initial)',
    response.status === 200 && Array.isArray(response.body?.data),
    `status=${response.status}`,
  );

  response = await request('/items', {
    method: 'POST',
    headers: authHeaders(tokenA),
    body: JSON.stringify({ text: 'Test task', type: 'task', level: 0 }),
  });
  check(
    'POST /items',
    response.status === 201 &&
      response.body?.data?.text === 'Test task' &&
      response.body?.data?.userId === itemOwnerId,
    `status=${response.status}`,
  );
  const itemId = response.body?.data?.id;

  response = await request(`/items/${itemId}`, {
    method: 'PATCH',
    headers: authHeaders(tokenA),
    body: JSON.stringify({ completed: true, level: 1 }),
  });
  check(
    'PATCH /items/:id',
    response.status === 200 &&
      response.body?.data?.completed === true &&
      response.body?.data?.level === 1,
    `status=${response.status}`,
  );

  response = await request('/items/reorder', {
    method: 'PUT',
    headers: authHeaders(tokenA),
    body: JSON.stringify({ items: [{ id: itemId, orderIndex: 99 }] }),
  });
  check(
    'PUT /items/reorder',
    response.status === 200 && response.body?.message === 'Reorder successful',
    `status=${response.status}`,
  );

  response = await request('/items', { headers: authHeaders(tokenA) });
  const reorderedItem = Array.isArray(response.body?.data)
    ? response.body.data.find((item) => item.id === itemId)
    : null;
  check(
    'GET /items (after reorder)',
    response.status === 200 && reorderedItem?.orderIndex === 99,
    `status=${response.status}`,
  );

  response = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userB),
  });
  check(
    'POST /auth/register (user B)',
    response.status === 201 && response.body?.data?.token,
    `status=${response.status}`,
  );
  const tokenB = response.body?.data?.token;

  response = await request(`/items/${itemId}`, {
    method: 'PATCH',
    headers: authHeaders(tokenB),
    body: JSON.stringify({ text: 'should not work' }),
  });
  check(
    'PATCH other user item',
    response.status === 404 && response.body?.error === 'NOT_FOUND',
    `status=${response.status}`,
  );

  response = await request('/items/reorder', {
    method: 'PUT',
    headers: authHeaders(tokenB),
    body: JSON.stringify({ items: [{ id: itemId, orderIndex: 1 }] }),
  });
  check(
    'PUT reorder other user item',
    response.status === 404 && response.body?.error === 'NOT_FOUND',
    `status=${response.status}`,
  );

  response = await request('/items', {});
  check(
    'GET /items (no token)',
    response.status === 401 && response.body?.error === 'UNAUTHORIZED',
    `status=${response.status}`,
  );

  response = await request(`/items/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(tokenA),
  });
  check(
    'DELETE /items/:id',
    response.status === 200 && response.body?.message === 'Item deleted',
    `status=${response.status}`,
  );

  response = await request('/items', { headers: authHeaders(tokenA) });
  const deletedItemStillVisible = Array.isArray(response.body?.data)
    ? response.body.data.some((item) => item.id === itemId)
    : true;
  check(
    'Soft-deleted item hidden',
    response.status === 200 && deletedItemStillVisible === false,
    `status=${response.status}`,
  );

  console.log();
  console.log(`Results: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('Test run failed:', error);
  process.exit(1);
});
