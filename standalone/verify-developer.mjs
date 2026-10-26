/**
 * Verifies the icon-only developer block in a built single-file app:
 * icons present, no visible text leak, WhatsApp/e-mail hrefs correct,
 * and the monogram popover reveals the details.
 * Usage: node <path> <html> [label]
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const html = resolve(process.argv[2]);
const label = process.argv[3] ?? "app";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const wa = page.locator('a[href*="wa.me"]').first();
const mail = page.locator('a[href^="mailto:"]').first();
const monogram = page.getByRole("button", { name: /Assm Mssto/ }).first();

const waHref = await wa.getAttribute("href");
const mailHref = await mail.getAttribute("href");
const visibleText = await page.evaluate(() => {
  const body = document.body.innerText;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const leaks = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent) continue;
    const cs = getComputedStyle(parent);
    const hidden =
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      Number(cs.opacity) === 0 ||
      parent.closest(".sr-only") !== null;
    const text = node.textContent || "";
    if (!hidden && /0930322406|assmm944@gmail\.com|Assm Mssto/.test(text)) leaks.push(text.trim());
  }
  return { leaks, count: leaks.length, srOnlyText: body.includes("assmm944@gmail.com") };
});
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
);

await monogram.click();
await page.waitForTimeout(300);
const popover = await page.evaluate(() => {
  const body = document.body.innerText;
  return {
    hasPhone: body.includes("0930322406"),
    hasEmail: body.includes("assmm944@gmail.com"),
    hasName: body.includes("Assm Mssto"),
  };
});
await page.screenshot({ path: `screenshots/developer-${label}.png` });

const result = {
  label,
  whatsappLink: waHref,
  mailLink: mailHref,
  iconsVisible: (await wa.count()) > 0 && (await mail.count()) > 0 && (await monogram.count()) > 0,
  textHiddenBeforeClick: visibleText.count === 0,
  revealedOnClick: popover.hasPhone && popover.hasEmail && popover.hasName,
  horizontalOverflow: overflow,
  consoleErrors: errors,
};
result.ok =
  result.iconsVisible &&
  waHref?.includes("963930322406") &&
  mailHref === "mailto:assmm944@gmail.com" &&
  result.textHiddenBeforeClick &&
  result.revealedOnClick &&
  !overflow &&
  errors.length === 0;

console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.ok ? 0 : 1);
