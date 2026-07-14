import { chromium, devices } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const port = 8768;
const testImage = path.join(root, 'assets/Bg/blue-sky-green-hill-white-flowers.jpg');

function startServer() {
  return spawn('python3', ['-m', 'http.server', String(port)], {
    cwd: root,
    stdio: 'ignore',
  });
}

async function runScenario(browser, label, options = {}) {
  const context = await browser.newContext({
    ...(options.mobile ? devices['iPhone 13'] : {}),
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto(`http://127.0.0.1:${port}/index.html?automatedTest=1`, {
    waitUntil: 'networkidle',
  });

  await page.setInputFiles('#file-input', testImage);
  await page.click('#btn-start');
  await page.waitForSelector('#screen-play.active');

  await page.evaluate(() => window.__jmTest.completePuzzleAndDecorate());
  await page.waitForSelector('#screen-decorate.active');

  const hitTest = await page.evaluate(() => {
    const share = document.getElementById('btn-share');
    const save = document.getElementById('btn-save-image');
    const centerOf = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const sharePoint = centerOf(share);
    const savePoint = centerOf(save);
    const topShare = document.elementFromPoint(sharePoint.x, sharePoint.y);
    const topSave = document.elementFromPoint(savePoint.x, savePoint.y);
    return {
      shareClickable: topShare === share || share.contains(topShare),
      saveClickable: topSave === save || save.contains(topSave),
      shareTop: topShare?.id || topShare?.className || topShare?.tagName,
      saveTop: topSave?.id || topSave?.className || topSave?.tagName,
    };
  });

  const exportResult = await page.evaluate(async () => {
    try {
      const blob = await window.__jmTest.getShareBlob();
      return { ok: true, size: blob.size, type: blob.type };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  await page.evaluate(() => {
    window.__shareCalled = false;
    navigator.share = async (data) => {
      window.__shareCalled = true;
      window.__shareFileName = data.files?.[0]?.name || null;
      window.__shareFileSize = data.files?.[0]?.size || null;
    };
    navigator.canShare = () => true;
  });

  await page.locator('#btn-share').dispatchEvent('pointerdown');
  await page.waitForTimeout(1500);
  await page.click('#btn-share');
  await page.waitForTimeout(1500);

  const shareResult = await page.evaluate(() => ({
    shareCalled: window.__shareCalled === true,
    shareFileName: window.__shareFileName || null,
    shareFileSize: window.__shareFileSize || null,
  }));

  const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.locator('#btn-save-image').dispatchEvent('pointerdown');
  await page.waitForTimeout(1500);
  await page.click('#btn-save-image');
  const download = await downloadPromise;
  await page.waitForTimeout(500);

  const saveErrors = consoleErrors.filter((line) => /save failed/i.test(line));

  await context.close();

  return {
    label,
    hitTest,
    exportResult,
    shareResult,
    download: download
      ? { filename: download.suggestedFilename(), ok: true }
      : { ok: false },
    consoleErrors: consoleErrors.filter((line) => !/favicon|gtag|google/i.test(line)),
    saveErrors,
  };
}

const server = startServer();
await new Promise((resolve) => setTimeout(resolve, 900));

const browser = await chromium.launch();
const results = [];

try {
  results.push(await runScenario(browser, 'desktop-chrome', { mobile: false }));
  results.push(await runScenario(browser, 'iphone-13', { mobile: true }));
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

const failed = [];
for (const result of results) {
  if (!result.hitTest.shareClickable || !result.hitTest.saveClickable) {
    failed.push(`${result.label}: buttons blocked (${JSON.stringify(result.hitTest)})`);
  }
  if (!result.exportResult.ok || result.exportResult.size < 1000) {
    failed.push(`${result.label}: export failed (${JSON.stringify(result.exportResult)})`);
  }
  if (!result.shareResult.shareCalled || result.shareResult.shareFileSize < 1000) {
    failed.push(`${result.label}: share not invoked (${JSON.stringify(result.shareResult)})`);
  }
  if (!result.download.ok) {
    failed.push(`${result.label}: save download missing`);
  }
  if (result.saveErrors.length) {
    failed.push(`${result.label}: save console errors (${result.saveErrors.join('; ')})`);
  }
}

console.log(JSON.stringify({ results, failed, pass: failed.length === 0 }, null, 2));
process.exit(failed.length ? 1 : 0);
