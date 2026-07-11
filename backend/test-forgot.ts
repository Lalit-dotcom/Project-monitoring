import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const baseUrl = 'http://localhost:4000';

async function getLatestOtp(client: pg.Client, username: string): Promise<string | null> {
  const res = await client.query(
    "SELECT code FROM password_reset_otps WHERE username = $1 ORDER BY created_at DESC LIMIT 1",
    [username]
  );
  return res.rows.length > 0 ? res.rows[0].code : null;
}

async function getOtpDetails(client: pg.Client, username: string) {
  const res = await client.query(
    "SELECT code, used, attempt_count FROM password_reset_otps WHERE username = $1 ORDER BY created_at DESC LIMIT 1",
    [username]
  );
  return res.rows[0];
}

async function requestOtp(username: string) {
  const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  return res.status;
}

async function verifyOtp(username: string, code: string) {
  const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, code })
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function resetPassword(resetToken: string, newPassword: string) {
  const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, newPassword })
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function login(username: string, password: string) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log('Starting end-to-end Password Reset flow tests...');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Clean up past OTPs
    await client.query("DELETE FROM password_reset_otps WHERE username = 'atul'");

    // ==================== TEST 1: OTP Lockout (5 incorrect attempts) ====================
    console.log('\n--- Test 1: OTP Lockout (5 incorrect attempts) ---');
    
    // Request OTP
    let status = await requestOtp('atul');
    console.log('Request OTP status:', status);
    
    const initialOtp = await getLatestOtp(client, 'atul');
    console.log('Generated OTP code:', initialOtp);

    // Call verify-otp 5 times with a wrong code
    for (let i = 1; i <= 6; i++) {
      const { status: verifyStatus, data } = await verifyOtp('atul', '999999');
      const details = await getOtpDetails(client, 'atul');
      console.log(`Attempt ${i}: verify-otp status = ${verifyStatus}, attempt_count = ${details.attempt_count}, used = ${details.used}, response =`, data);
    }

    // Try verifying the locked OTP with the correct code
    if (initialOtp) {
      console.log('Trying to verify locked OTP with correct code...');
      const { status: verifyStatus, data } = await verifyOtp('atul', initialOtp);
      console.log('Status:', verifyStatus, 'Response:', data);
    }

    // ==================== TEST 2: Fresh OTP Request after Lockout ====================
    console.log('\n--- Test 2: Fresh OTP Request after Lockout ---');
    
    status = await requestOtp('atul');
    console.log('Request new OTP status:', status);
    
    const secondOtp = await getLatestOtp(client, 'atul');
    console.log('New OTP code:', secondOtp);
    
    const secondDetails = await getOtpDetails(client, 'atul');
    console.log('New OTP details:', secondDetails);

    // Verify correct code
    if (secondOtp) {
      console.log('Verifying new OTP with correct code...');
      const { status: verifyStatus, data } = await verifyOtp('atul', secondOtp);
      console.log('Status:', verifyStatus, 'Response:', data);
      
      const resetToken = data.resetToken;
      if (resetToken) {
        console.log('Reset token issued successfully!');

        // Reset password
        console.log('Resetting password to "atulnewpassword"...');
        const { status: resetStatus, data: resetData } = await resetPassword(resetToken, 'atulnewpassword');
        console.log('Reset password status:', resetStatus, 'Response:', resetData);

        // Test login with old password "123" (should fail)
        console.log('Testing login with old password "123"...');
        const { status: oldLoginStatus, data: oldLoginData } = await login('atul', '123');
        console.log('Status:', oldLoginStatus, 'Response:', oldLoginData);

        // Test login with new password (should succeed)
        console.log('Testing login with new password "atulnewpassword"...');
        const { status: newLoginStatus, data: newLoginData } = await login('atul', 'atulnewpassword');
        console.log('Status:', newLoginStatus, 'Response:', newLoginData);

        // Restore password back to "123"
        console.log('Restoring password back to "123"...');
        const restoreHash = await bcrypt.hash('123', 10);
        await client.query("UPDATE users SET password_hash = $1 WHERE username = 'atul'", [restoreHash]);
        console.log('Password restored successfully.');
      } else {
        console.error('Failed to get reset token');
      }
    }

  } catch (error) {
    console.error('Test run failed:', error);
  } finally {
    await client.end();
  }
}

run();
