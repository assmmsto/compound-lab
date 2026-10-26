/**
 * Screenshots the new nine-section lab result card for visual delivery.
 * Run: node standalone/shot-result.mjs
 */
import { createServer } from "node:http";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { chromium } from "playwright";

const PORT = 8795;
const REPORT = {
  assumption: "ديكلون = diclofenac حسب الافتراض المحلي الشائع",
  verdict: "avoid",
  severity: "major",
  evidence: "established",
  confidence: "high",
  headline: "جمع مضادَّي التهاب: خطر نزف هضمي مرتفع",
  product:
    "لا ينتج مركب جديد، بل أثر علاجي تراكمي: تثبيط COX كامل يعرّض المخاطية المعدية للنزف. عملياً يشبه مفعول جرعة مضاعفة من أحدهما.",
  observation: "لا تغيّر مرئي في الوعاء. الأعراض تظهر على المريض بعد ساعات إلى أيام: ألم معدة، سواد براز.",
  mechanism:
    "كلا المركبين يثبّطان COX-1 الواقي للمخاطية المعدية، فتضعف الحماية مرتين معاً بدل مرة واحدة.",
  preparation: [
    "لا تُعدّ تركيبة مشتركة بينهما — افصل الإعطاء ساعتين على الأقل.",
    "تحقق: اسأل المريض عن أي ألم معدة أو سواد براز قبل كل جرعة تالية.",
  ],
  stability: "غير معروف عندي كتركيبة مشتركة — لا تُحفظ حبتان مدمجتان في وعاء واحد.",
  suitableFor: ["لا يُوصى به لأي فئة دون أمر طبي صريح"],
  unsuitableFor: ["قرحة معدة", "تاريخ نزف هضمي", "الحمل", "المسنّون فوق 65"],
  harm: "ألم معدة، سواد البراز، قيء دموي، دوخة وشحوب — أي منها طارئ فوري وليس عرضاً بسيطاً.",
  safety: ["لا تدمج الحبتين في وعاء واحد", "أضف حماية معدية (مثبط مضخة البروتون) بإشراف طبي"],
  alternative: "اختر مسكّناً واحداً فقط: الباراسيتامول بديل مقبول عند الحاجة، وإلا فالإسبرين وحده بجرعة أدنى.",
  uncertainties: "لم تُحدَّد الجرعات ولا عوامل خطورة المريض (العمر، الكلى، الأدوية الأخرى).",
};

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, accept");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url?.endsWith("/models")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ object: "list", data: [{ id: "river-large" }] }));
    return;
  }
  if (req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: JSON.stringify(REPORT) } }] }));
    });
    return;
  }
  res.writeHead(404);
  res.end();
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 430, height: 1400 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(fileURLToPath(new URL("../dist-standalone/pharmacy-lab.html", import.meta.url))).href, {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: "إعداد المزوّد" }).click();
await page.locator("#provider-url").fill(`http://127.0.0.1:${PORT}/v1`);
await page.locator("#provider-key").fill("shot-key");
await page.getByRole("button", { name: "فحص الاتصال وجلب النماذج" }).click();
await page.getByText(/تم الاتصال/).first().waitFor({ timeout: 20000 });
await page.getByRole("button", { name: "إغلاق" }).click();
await page.getByRole("textbox", { name: "المركب 1", exact: true }).fill("أسبرين");
await page.getByRole("textbox", { name: "المركب 2", exact: true }).fill("ديكلون");
await page.getByRole("button", { name: "أجرِ التجربة" }).click();
await page.getByText("لا تخلطهما").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(400);
await page.screenshot({ path: "screenshots/result-card.png", fullPage: true });
console.log("saved screenshots/result-card.png");
await browser.close();
server.close();
