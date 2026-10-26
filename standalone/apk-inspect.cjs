const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const cfg = JSON.parse(fs.readFileSync(path.join(root, "x", "assets", "capacitor.config.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "x", "assets", "public", "index.html"), "utf8");
const sections = [
  "ماذا ينتج عن الدمج",
  "ماذا سترى بعينك",
  "طريقة التحضير",
  "الثبات والصلاحية",
  "يصلح لمن",
  "لا يصلح لمن",
  "الضرر وكيف يظهر",
  "السلامة والمناولة والتخلص",
  "البديل",
];
console.log("appId            :", cfg.appId);
console.log("appName          :", cfg.appName);
console.log("CapacitorHttp    :", cfg.plugins && cfg.plugins.CapacitorHttp && cfg.plugins.CapacitorHttp.enabled);
console.log("verdict labels   :", html.includes("لا تخلطهما"), html.includes("يُخلطان بحذر"));
console.log("evidence labels  :", html.includes("مثبت في مرجع"));
console.log("nine sections    :", sections.every((x) => html.includes(x)), `(${sections.filter((x) => html.includes(x)).length}/9)`);
console.log("card tab removed :", !html.includes("البطاقة"));
console.log("no tablist       :", !html.includes("tablist"));
console.log("html size KB     :", Math.round(Buffer.byteLength(html) / 1024));
