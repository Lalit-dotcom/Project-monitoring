async function test() {
  const baseUrl = 'http://localhost:4000';

  console.log('--- TEST 1: Get projects WITHOUT token ---');
  try {
    const res = await fetch(`${baseUrl}/api/projects`);
    console.log('Status code:', res.status);
    const body = await res.json();
    console.log('Response body:', body);
  } catch (err: any) {
    console.error('Test 1 failed:', err.message);
  }

  console.log('\n--- TEST 2: Login with CORRECT credentials (admin/admin) ---');
  let accessToken = '';
  let refreshToken = '';
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    console.log('Status code:', res.status);
    const body = await res.json();
    console.log('Response body:', body);
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  } catch (err: any) {
    console.error('Test 2 failed:', err.message);
  }

  console.log('\n--- TEST 3: Login with WRONG credentials ---');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
    });
    console.log('Status code:', res.status);
    const body = await res.json();
    console.log('Response body:', body);
  } catch (err: any) {
    console.error('Test 3 failed:', err.message);
  }

  console.log('\n--- TEST 4: Get projects WITH correct token ---');
  try {
    const res = await fetch(`${baseUrl}/api/projects`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('Status code:', res.status);
    const body = await res.json();
    console.log('Response projects count:', body.data ? body.data.length : 'none');
  } catch (err: any) {
    console.error('Test 4 failed:', err.message);
  }

  console.log('\n--- TEST 5: Lockout trigger (5 consecutive failed attempts) ---');
  for (let i = 1; i <= 5; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'user_temp', password: 'bad' })
      });
      console.log(`Attempt ${i} status:`, res.status);
      const body = await res.json();
      console.log(`Attempt ${i} response:`, body);
    } catch (err: any) {
      console.error(`Attempt ${i} error:`, err.message);
    }
  }
}
test();
