/**
 * End-to-end functional test of the real artifact (dist-standalone/pharmacy-lab.html)
 * against a local MOCK OpenAI-compatible provider. Proves the whole chain:
 * settings save → model fetch → lab run → report render → history persist —
 * with zero cloud. Uses system Edge (Playwright channel msedge).
 *
 * Run: node standalone/e2e-mock.mjs   (after npm run build:standalone)
 */
import { createServer } from "node:http";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { chromium } from "playwright";

const PORT = 8787;
const BASE = `http://127.0.0.1:${PORT}/v1`;

const LAB_REPORT = {
  assumption: "محلولان مائيان بتركيز 5٪، بدرجة حرارة الغرفة",
  verdict: "caution",
  severity: "minor",
  evidence: "established",
  confidence: "high",
  headline: "تعادل حمض-قاعدة: ينتج ملح وماء مع ارتفاع حرارة خفيف",
  product:
    "NaOH + HCl → NaCl + H₂O. ينتج محلول كلوريد الصوديوم (ملحي مخفف) والماء، مع حرارة تتعادل.",
  observation: "لا راسب ولا لون. حرارة خفيفة عند إضافة القاعدة إلى الحمض، وقد يبدو المحلول شفافاً تماماً.",
  mechanism:
    "أيون الهيدروجين من الحمض يتحد مع أيون الهيدروكسيد من القاعدة ويكوّنان الماء — تفاعل ناشر للحرارة.",
  preparation: [
    "أضف الحمض إلى الماء أولاً، ثم أضف القاعدة تدريجياً مع تحريك.",
    "تحقق: راقب حرارة الوعاء، وتوقف إن سخن فوق حرارة الغرفة بوضوح.",
    "تحقق: قس pH، وإن لم يتعادل (خارج 6–8) أكمل الإضافة تدريجياً.",
  ],
  stability: "المحلول الناتج مستقر أياماً في وعاء مغلق، بعيداً عن الضوء المباشر.",
  suitableFor: ["تجربة تعليمية للصيدلي", "تحضير محلول مشاهد بتراكيز محسوبة"],
  unsuitableFor: ["مزج مركز مع مركز مباشرة", "العبث دون حماية عينين وقفازات"],
  harm: "الحرارة قد ترفع حرارة المحلول فتؤذي الجلد أو العين؛ حمض أو قاعدة مركزة تسبب حروقاً كيميائية — حرقة تستمر = طارئ.",
  safety: [
    "اسكب القاعدة في الماء لا العكس",
    "قفازات ونظارة واقية إلزامية، وتهوية جيدة",
    "اسكب الناتج المخفف في المصرف مع ماء وفير",
  ],
  alternative: "لأثر مرئي واضح: نترات الفضة + كلوريد الصوديوم → راسب أبيض من AgCl.",
  uncertainties: "التراكيز الفعلية غير محددة، وترتيب المزج يغير شدة الحرارة.",
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, accept");
}

const server = createServer((req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url?.endsWith("/models")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ object: "list", data: [{ id: "mock-fast-1" }, { id: "mock-pro-2" }] }));
    return;
  }
  if (req.method === "POST" && req.url?.endsWith("/chat/completions")) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [
            { message: { role: "assistant", content: JSON.stringify(LAB_REPORT) } },
          ],
        }),
      );
    });
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { message: "unknown mock path" } }));
});

await new Promise((resolveListen) => server.listen(PORT, resolveListen));

const target = pathToFileURL(
  fileURLToPath(new URL("../dist-standalone/pharmacy-lab.html", import.meta.url)),
).href;

const steps = [];
function step(name, ok) {
  steps.push({ name, ok });
  if (!ok) throw new Error(`E2E step failed: ${name}`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));

  await page.goto(target, { waitUntil: "networkidle" });

  // 1) Open provider settings
  await page.getByRole("button", { name: "إعداد المزوّد" }).click();
  await page.locator("#provider-url").fill(BASE);
  await page.locator("#provider-key").fill("e2e-secret-key");

  // 2) Test connection → should fetch models over CORS
  await page.getByRole("button", { name: "فحص الاتصال وجلب النماذج" }).click();
  await page.waitForSelector("text=تم الاتصال", { timeout: 15000 });
  step("provider test connection + models fetch (CORS direct)", true);

  const selectValue = await page.locator("#provider-model").inputValue();
  step(`model auto-selected (${selectValue})`, Boolean(selectValue));

  await page.getByRole("button", { name: "إغلاق" }).click();

  // 3) Run the lab with two compounds (chemical, not commercial products)
  await page.getByRole("textbox", { name: "المركب 1", exact: true }).fill("هيدروكسيد الصوديوم");
  await page.getByRole("textbox", { name: "المركب 2", exact: true }).fill("حمض الهيدروكلوريك");
  await page.getByRole("button", { name: "امزج المركبات واقرأ النتيجة" }).click();
  await page.waitForSelector(`text=${LAB_REPORT.headline}`, { timeout: 15000 });
  step("lab run → report headline rendered", true);

  await page.waitForSelector('text=خطر', { timeout: 5000 }).catch(() => null);
  await page.waitForSelector("text=بسيط", { timeout: 5000 });
  step("severity badge «بسيط» rendered", true);

  await page.waitForSelector("text=يُخلطان بحذر", { timeout: 5000 });
  step("verdict banner «يُخلطان بحذر» rendered", true);

  await page.waitForSelector("text=ماذا ينتج عن الدمج", { timeout: 5000 });
  step("«ماذا ينتج عن الدمج» block rendered", true);

  await page.waitForSelector("text=ماذا سترى بعينك", { timeout: 5000 });
  step("«ماذا سترى بعينك» block rendered", true);

  await page.waitForSelector("text=طريقة التحضير", { timeout: 5000 });
  step("«طريقة التحضير» steps rendered", true);

  await page.waitForSelector("text=البديل", { timeout: 5000 });
  step("«البديل» block rendered (always a way out)", true);

  await page.waitForSelector("text=لا يصلح لمن", { timeout: 5000 });
  step("«لا يصلح لمن» block rendered", true);

  // 4) History lives under the lab now (no tabs): expand and find the run.
  await page.locator("summary", { hasText: "السجل" }).click();
  await page.getByText("هيدروكسيد الصوديوم + حمض الهيدروكلوريك").first().waitFor({ timeout: 5000 });
  step("history section lists the run", true);

  // 5) localStorage persistence (reload must keep provider + history)
  await page.reload({ waitUntil: "networkidle" });
  const persisted = await page.evaluate(() => ({
    provider: localStorage.getItem("pharmacy.provider.v1") ?? "",
    history: localStorage.getItem("pharmacy.history.v1") ?? "",
  }));
  step("provider persisted locally after reload", persisted.provider.includes(`127.0.0.1:${PORT}`));
  step("history persisted locally after reload", persisted.history.includes("هيدروكسيد الصوديوم"));
  step("model shown on settings button after reload",
    Boolean(await page.getByRole("button", { name: /mock-(fast|pro)/ }).count()));

  step("no console errors during the whole flow", consoleErrors.length === 0);
} finally {
  await browser.close();
  server.close();
}

console.log(JSON.stringify({ ok: true, steps }, null, 2));
