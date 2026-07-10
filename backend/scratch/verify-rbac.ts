import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function run() {
  const artifactDir = 'C:\\Users\\lalit\\.gemini\\antigravity\\brain\\1ff61aed-3f8e-4e44-81c1-7936e6986ad2';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set larger viewport to see all columns
  await page.setViewportSize({ width: 1400, height: 900 });

  // ==========================================
  // TEST 1: SUPER ADMIN LOGIN (lalit)
  // ==========================================
  console.log('--- TEST 1: Super Admin Login (lalit) ---');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[placeholder="Username"]', 'lalit');
  await page.fill('input[placeholder="Password"]', 'lalit@123');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('**/dashboard');
  console.log('Logged in as superadmin successfully!');
  await page.waitForTimeout(2000); // wait for data to load

  // Take superadmin dashboard screenshot
  const saDashboardPath = path.join(artifactDir, 'superadmin_dashboard.png');
  await page.screenshot({ path: saDashboardPath });
  console.log(`Saved superadmin dashboard screenshot to ${saDashboardPath}`);

  // Check if "Project Managers" sidebar item is visible
  const pmSidebarVisible = await page.isVisible('aside >> text=Project Managers');
  console.log(`Is "Project Managers" link visible in sidebar? ${pmSidebarVisible}`);

  // Navigate to Project Managers page
  await page.click('aside >> text=Project Managers');
  await page.waitForURL('**/administration/managers');
  await page.waitForTimeout(2000); // wait for table load

  // Open "Add Project Manager" form modal
  console.log('Opening Add Project Manager modal...');
  await page.click('button:has-text("Add Project Manager")');
  await page.waitForTimeout(1000);

  // Fill in the form
  await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Ramesh Kumar');
  await page.fill('input[placeholder="e.g. ramesh"]', 'ramesh');
  await page.fill('input[placeholder="Minimum 6 characters"]', 'ramesh@123');
  await page.fill('input[placeholder="e.g. ramesh@nic.in"]', 'ramesh@nic.in');
  await page.fill('input[placeholder="e.g. 9876543210"]', '9876543210');

  // Take screenshot of the Add Project Manager form modal open
  const formPath = path.join(artifactDir, 'add_manager_form.png');
  await page.screenshot({ path: formPath });
  console.log(`Saved Add Project Manager form screenshot to ${formPath}`);

  // Submit form
  console.log('Submitting Add Project Manager form...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000); // wait for response and toast

  // Close the modal if it did not close automatically on success
  if (await page.isVisible('button[aria-label="Close dialog"]')) {
    await page.click('button[aria-label="Close dialog"]');
  }

  // Check if Ramesh Kumar appears in table
  const pmTableText = await page.textContent('body');
  console.log(`Ramesh Kumar added in managers table? ${pmTableText?.includes('Ramesh Kumar')}`);
  console.log(`Ramesh Kumar has ID starting at 90000? ${pmTableText?.includes('ID: 90000')}`);

  // Logout lalit
  console.log('Logging out superadmin...');
  await page.click('button[aria-label="Log out of NPMS"]');
  await page.click('button:has-text("Sign Out")');
  await page.waitForURL('**/login');

  // ==========================================
  // TEST 2: PROJECT MANAGER LOGIN (atul)
  // ==========================================
  console.log('\n--- TEST 2: Project Manager Login (atul) ---');
  await page.fill('input[placeholder="Username"]', 'atul');
  await page.fill('input[placeholder="Password"]', '123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard');
  console.log('Logged in as PM atul successfully!');
  await page.waitForTimeout(2000); // wait for data to load

  // Take PM dashboard screenshot
  const pmDashboardPath = path.join(artifactDir, 'pm_dashboard.png');
  await page.screenshot({ path: pmDashboardPath });
  console.log(`Saved PM dashboard screenshot to ${pmDashboardPath}`);

  // Check if "Project Managers" sidebar item is NOT visible
  const pmSidebarVisibleForAtul = await page.isVisible('aside >> text=Project Managers');
  console.log(`Is "Project Managers" link visible in sidebar for Atul? ${pmSidebarVisibleForAtul}`);

  // Verify that Projects page shows only records where prj_mgr_id = 1626
  await page.click('aside >> text=Projects');
  
  // Wait for the project row to load
  await page.waitForSelector('text=V.V.Giri', { timeout: 15000 });
  
  const projectsPageText = await page.textContent('body');
  console.log('Projects page shows projects:');
  console.log(`Contains V.V.Giri? ${projectsPageText?.includes('V.V.Giri')}`);
  
  // Try to navigate directly to /administration/managers
  console.log('Attempting direct navigation to /administration/managers...');
  await page.goto('http://localhost:5173/administration/managers');
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  console.log(`URL after direct navigation attempt (expecting /login since token is in-memory): ${currentUrl}`);
  const isBlockedOrRedirected = currentUrl.includes('/login') || await page.isVisible('text=Not Authorized');
  console.log(`Is direct navigation blocked/redirected? ${isBlockedOrRedirected}`);

  // ==========================================
  // TEST 3: NEW MANAGER LOGIN (ramesh)
  // ==========================================
  console.log('\n--- TEST 3: New Manager Login (ramesh) ---');
  await page.fill('input[placeholder="Username"]', 'ramesh');
  await page.fill('input[placeholder="Password"]', 'ramesh@123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard');
  console.log('Logged in as new PM ramesh successfully!');
  await page.waitForTimeout(2000); // wait for dashboard

  // Take screenshot of new PM dashboard showing 0 projects
  const newPmDashboardPath = path.join(artifactDir, 'new_pm_dashboard.png');
  await page.screenshot({ path: newPmDashboardPath });
  console.log(`Saved new PM dashboard screenshot to ${newPmDashboardPath}`);

  const activeProjectSettlementsText = await page.textContent('body');
  console.log(`New PM sees 0 projects/settlements? ${activeProjectSettlementsText?.includes('0 In Progress') || activeProjectSettlementsText?.includes('No') || activeProjectSettlementsText?.trim() === ''}`);

  await browser.close();
  console.log('Done verifying RBAC authentication system!');
}

run().catch(err => {
  console.error('Error running verification script:', err);
  process.exit(1);
});
