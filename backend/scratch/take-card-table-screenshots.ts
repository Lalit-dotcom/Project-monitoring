import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function run() {
  const artifactDir = 'C:\\Users\\lalit\\.gemini\\antigravity\\brain\\bdd775b2-50bd-45ed-a94f-9dbcb3b2208c';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set larger viewport to see all columns
  await page.setViewportSize({ width: 1600, height: 1000 });

  // 1. Connect to login page
  console.log('Navigating to login page...');
  await page.goto('http://localhost:5173/login');
  
  // 2. Login
  console.log('Logging in...');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  await page.waitForURL('**/dashboard');
  console.log('Logged in successfully!');
  await page.waitForTimeout(1000);

  // 3. Navigate to Projects page
  console.log('Navigating to Projects page via Sidebar...');
  await page.click('aside >> text=Projects');
  await page.waitForTimeout(3000); // Wait for API fetch and animation

  // Let's filter by Payment Status: "Partially Paid"
  console.log('Selecting "Partially Paid" from Payment Status select...');
  await page.selectOption('select', 'Partially Paid');
  await page.waitForTimeout(3000); // Wait for refetch and animation

  // Take screenshot of the Card view
  const cardPath = path.join(artifactDir, 'projects_card_view.png');
  await page.screenshot({ path: cardPath, fullPage: false });
  console.log(`Saved card view screenshot to ${cardPath}`);

  // 4. Toggle to Table view
  console.log('Toggling to Table view...');
  await page.click('button[title="Table View"]');
  await page.waitForTimeout(3000); // Wait for transition and stagger animation

  // Take screenshot of the Table view
  const tablePath = path.join(artifactDir, 'projects_table_view.png');
  await page.screenshot({ path: tablePath, fullPage: false });
  console.log(`Saved table view screenshot to ${tablePath}`);

  await browser.close();
  console.log('Done capturing card and table screenshots!');
}

run().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
