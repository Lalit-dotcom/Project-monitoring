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
  return { status: res.status, headers: res.headers, data };
}

async function run() {
  console.log('Starting end-to-end Password Reset and Direct OTP Login flow tests...');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Clean up past OTPs
    await client.query("DELETE FROM password_reset_otps WHERE username IN ('atul', 'lalit')");

    // Get atul's password hash BEFORE the flow
    const hashResBefore = await client.query("SELECT password_hash FROM users WHERE username = 'atul'");
    const atulHashBefore = hashResBefore.rows[0].password_hash;
    console.log("Atul's password hash BEFORE flow:", atulHashBefore);

    // ==================== TEST 1: PM (atul) OTP Verification - DIRECT LOGIN ====================
    console.log('\n--- Test 1: PM (atul) OTP Verification - DIRECT LOGIN ---');
    
    // Request OTP
    let status = await requestOtp('atul');
    console.log('Request OTP status:', status);
    
    const atulOtp = await getLatestOtp(client, 'atul');
    console.log('Atul OTP code:', atulOtp);

    if (atulOtp) {
      console.log('Verifying atul OTP...');
      const { status: verifyStatus, headers, data } = await verifyOtp('atul', atulOtp);
      console.log('Verify Status:', verifyStatus);
      console.log('Verify Response Body:', data);
      
      const cookie = headers.get('set-cookie');
      console.log('Refresh token cookie set:', !!cookie);

      // Assertions
      if (data.accessToken && data.user && data.user.role === 'project_manager') {
        console.log('SUCCESS: Project Manager logged in directly with access token and user info!');
      } else {
        console.error('FAIL: PM did not log in directly!');
      }
      if (data.resetToken) {
        console.error('FAIL: PM received a resetToken!');
      }
    }

    // Get atul's password hash AFTER the flow
    const hashResAfter = await client.query("SELECT password_hash FROM users WHERE username = 'atul'");
    const atulHashAfter = hashResAfter.rows[0].password_hash;
    console.log("Atul's password hash AFTER flow:", atulHashAfter);

    if (atulHashBefore === atulHashAfter) {
      console.log("SUCCESS: Atul's password hash is COMPLETELY UNTOUCHED.");
    } else {
      console.error("FAIL: Atul's password hash was modified!");
    }

    // ==================== TEST 2: Superadmin (lalit) OTP Verification - PASSWORD RESET ====================
    console.log('\n--- Test 2: Superadmin (lalit) OTP Verification - PASSWORD RESET ---');
    
    // Request OTP
    status = await requestOtp('lalit');
    console.log('Request OTP status:', status);
    
    const lalitOtp = await getLatestOtp(client, 'lalit');
    console.log('Lalit OTP code:', lalitOtp);

    if (lalitOtp) {
      console.log('Verifying lalit OTP...');
      const { status: verifyStatus, data } = await verifyOtp('lalit', lalitOtp);
      console.log('Verify Status:', verifyStatus);
      console.log('Verify Response Body:', data);

      if (data.resetToken) {
        console.log('SUCCESS: Superadmin received a password reset token as expected!');
      } else {
        console.error('FAIL: Superadmin did not receive a resetToken!');
      }
      if (data.accessToken) {
        console.error('FAIL: Superadmin logged in directly instead of getting a resetToken!');
      }
    }

  } catch (error) {
    console.error('Test run failed:', error);
  } finally {
    await client.end();
  }
}

run();
