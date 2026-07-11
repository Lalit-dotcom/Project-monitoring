const baseUrl = 'http://localhost:4000';

async function testForgotPassword(username: string) {
  const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const data = await res.json();
  console.log(`Response for ${username}:`, data);
}

async function run() {
  await testForgotPassword('atul');
  await testForgotPassword('made-up-user');
}

run();
