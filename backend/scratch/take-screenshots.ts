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

  // 1. Try to connect to localhost:5173
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

  // 3. Navigate to Projects via Sidebar to preserve in-memory token
  console.log('Navigating to Projects page via Sidebar...');
  // In Sidebar.tsx, we have a link to /projects with label 'Projects'
  await page.click('aside >> text=Projects');
  await page.waitForTimeout(3000); // Wait for API fetch and animation

  const projectsPath = path.join(artifactDir, 'projects_portfolio.png');
  await page.screenshot({ path: projectsPath, fullPage: false });
  console.log(`Saved projects screenshot to ${projectsPath}`);

  // 4. Navigate to Purchase Orders via Sidebar to preserve in-memory token
  console.log('Navigating to Purchase Orders page via Sidebar...');
  await page.click('aside >> text=Purchase Orders');
  await page.waitForTimeout(3000); // Wait for API fetch and animation

  // Open advanced filters drawer
  console.log('Opening advanced filters drawer...');
  await page.click('text=More Filters');
  await page.waitForTimeout(1000);

  // Enter "2" in Expiring within (months) input
  console.log('Applying "Expiring within 2 months" filter...');
  await page.fill('input[placeholder="e.g. 3"]', '2');
  
  // Take screenshot of the open filter drawer state as well!
  const poDrawerPath = path.join(artifactDir, 'purchase_orders_drawer_open.png');
  await page.screenshot({ path: poDrawerPath, fullPage: false });
  console.log(`Saved purchase orders drawer open screenshot to ${poDrawerPath}`);

  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(3000); // Wait for API refetch and animation

  const poPath = path.join(artifactDir, 'purchase_orders_expiring_soon.png');
  await page.screenshot({ path: poPath, fullPage: false });
  console.log(`Saved purchase orders screenshot to ${poPath}`);

  await browser.close();
  console.log('Done capturing screenshots!');
}

run().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
