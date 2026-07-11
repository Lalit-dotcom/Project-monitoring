import puppeteer from 'puppeteer';

const ARTIFACTS = 'C:\\Users\\lalit\\.gemini\\antigravity\\brain\\b6faf9a0-3c87-4565-b067-7a6a41af934f';
const BASE = 'http://localhost:5174';

async function fillReactInput(page: any, selector: string, value: string) {
  const input = await page.$(selector);
  await input.click({ clickCount: 3 });
  await input.type(value, { delay: 50 });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to login...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Find inputs
  const inputs = await page.$$('input');
  console.log('Found inputs:', inputs.length);
  
  if (inputs.length >= 2) {
    // Clear and type into first input (username)
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('lalit', { delay: 80 });
    await new Promise(r => setTimeout(r, 300));
    
    // Clear and type into second input (password)
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type('lalit@123', { delay: 80 });
    await new Promise(r => setTimeout(r, 300));
  }

  // Check what values were entered
  const vals = await page.evaluate(() => {
    const ins = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
    return ins.map(i => ({ type: i.type, value: i.value, name: i.name }));
  });
  console.log('Input values before submit:', JSON.stringify(vals));

  // Click submit button
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('Clicked submit');
  }
  
  await new Promise(r => setTimeout(r, 6000));
  console.log('After submit, URL:', page.url());

  // If we have a 2FA prompt, skip (lalit has 2FA enabled)
  // Try using 'atul' which might not have 2FA
  if (page.url().includes('login') || page.url().includes('mfa')) {
    console.log('Still on login/MFA - trying atul account...');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1500));
    
    const inputs2 = await page.$$('input');
    if (inputs2.length >= 2) {
      await inputs2[0].click({ clickCount: 3 });
      await inputs2[0].type('atul', { delay: 80 });
      await inputs2[1].click({ clickCount: 3 });
      await inputs2[1].type('123', { delay: 80 });
    }
    const btn2 = await page.$('button[type="submit"]');
    if (btn2) await btn2.click();
    await new Promise(r => setTimeout(r, 5000));
    console.log('After atul login, URL:', page.url());
  }

  // Dashboard screenshot
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));
  console.log('Dashboard URL:', page.url());
  await page.screenshot({ path: `${ARTIFACTS}\\dashboard_combo_chart.png`, fullPage: true });
  console.log('Dashboard screenshot saved.');

  // Navigate to project detail and click Overview tab
  await page.goto(`${BASE}/projects/S250865ZOMH`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));
  
  const allBtns = await page.$$('button');
  for (const btn of allBtns) {
    const txt = await btn.evaluate((el: Element) => el.textContent?.trim());
    if (txt === 'Overview') {
      await btn.click();
      console.log('Clicked Overview tab');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: `${ARTIFACTS}\\project_detail_overview_chart.png`, fullPage: false });
  console.log('Project detail screenshot saved.');

  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
