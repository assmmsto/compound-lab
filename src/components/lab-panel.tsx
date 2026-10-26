import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { LabReportView, RawAnswer } from "@/components/reports";
import { fieldClass, primaryBtn, quietBtn } from "@/components/ui";
import { runLab } from "@/lib/client-api";
import { arabicError } from "@/lib/messages";
import { parseLab } from "@/lib/normalize";
import { usePharmacy } from "@/lib/pharmacy-store";
import { asLabInput, providerReady, type HistoryItem, type LabInput } from "@/lib/types";

const MAX = 6;

export function LabPanel({ seed, onNeedSettings }: { seed: HistoryItem | null; onNeedSettings: () => void }) {
  const provider = usePharmacy((state) => state.provider);
  const addHistory = usePharmacy((state) => state.addHistory);
  const [compounds, setCompounds] = useState(["", ""]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<{ input: LabInput; content: string; model: string } | null>(null);

  useEffect(() => {
    if (!seed || seed.kind !== "lab") return;
    const input = asLabInput(seed.input);
    if (!input) return;
    setCompounds(input.compounds);
    setNote(input.note);
    setShown({ input, content: seed.content, model: seed.model });
    setError(null);
  }, [seed]);

  function updateCompound(index: number, value: string) {
    setCompounds((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  async function run() {
    if (pending) return; // Enter key path must respect the in-flight request too
    const cleaned = compounds.map((item) => item.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      setError("اكتب مركبين على الأقل.");
      return;
    }
    if (!providerReady(provider)) {
      setError(arabicError("not_configured"));
      onNeedSettings();
      return;
    }
    const input: LabInput = { compounds: cleaned.slice(0, MAX), note: note.trim() };
    setPending(true);
    setError(null);
    const result = await runLab(provider, input);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShown({ input, content: result.content, model: provider.model });
    addHistory({
      id: crypto.randomUUID(),
      kind: "lab",
      title: input.compounds.join(" + "),
      createdAt: Date.now(),
      model: provider.model,
      input,
      content: result.content,
    });
  }

  const report = shown ? parseLab(shown.content) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
        <div>
          <h2 className="text-lg font-semibold">طاولة دمج المركبات</h2>
          <p className="text-sm text-muted">
            ضع المادتين أو أكثر (مادة فعالة أو كاشف)، ثم اقرأ ماذا ينتج عن الدمج، وهل يصلح، ولمن، وما الضرر.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {compounds.map((compound, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-herb-soft text-sm font-semibold text-herb tabular-nums">
                {index + 1}
              </span>
              <input
                className={fieldClass}
                dir="auto"
                aria-label={`المركب ${index + 1}`}
                placeholder={
                  index === 0
                    ? "هيدروكسيد الصوديوم"
                    : index === 1
                      ? "حمض الهيدروكلوريك"
                      : "مركب آخر"
                }
                value={compound}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => updateCompound(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void run();
                  }
                }}
              />
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted disabled:opacity-40"
                aria-label={`حذف المركب ${index + 1}`}
                disabled={compounds.length <= 2}
                onClick={() => setCompounds((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={quietBtn}
            disabled={compounds.length >= MAX}
            onClick={() => setCompounds((current) => [...current, ""])}
          >
            <Plus className="size-4" />
            أضف مركباً
          </button>
          <button
            type="button"
            className={quietBtn}
            onClick={() => {
              setCompounds(["هيدروكسيد الصوديوم", "حمض الهيدروكلوريك"]);
              setNote("");
            }}
          >
            مثال: هيدروكسيد الصوديوم + حمض الهيدروكلوريك
          </button>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="lab-note">
          ملاحظة المختبر
          <textarea
            id="lab-note"
            className={`${fieldClass} min-h-24 py-2`}
            dir="auto"
            maxLength={500}
            placeholder="مثال: محلول مائي 5٪ بدرجة حرارة الغرفة، أو مزج في محقنة وريدية"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <button type="button" className={primaryBtn} disabled={pending} onClick={() => void run()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "تُجرى التجربة…" : "امزج المركبات واقرأ النتيجة"}
        </button>
        <div className="rounded-xl bg-paper-deep px-3 py-3">
          <p className="text-sm font-semibold">ماذا ستحصل عليه بعد المزج؟</p>
          <ol className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted">
            <li>① القرار (يُخلطان / بحذر / لا)</li>
            <li>② ماذا ينتج عن الدمج</li>
            <li>③ ماذا سترى بعينك</li>
            <li>④ لماذا يحدث</li>
            <li>⑤ طريقة التحضير خطوة بخطوة</li>
            <li>⑥ الثبات والصلاحية</li>
            <li>⑦ يصلح لمن / لا يصلح</li>
            <li>⑧ الضرر وكيف يظهر</li>
            <li>⑨ السلامة والتخلص</li>
            <li>⑩ البديل دائماً</li>
          </ol>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div aria-live="polite">
        {pending ? <p className="text-sm text-muted">يُكتب التقرير. قد يأخذ ذلك نصف دقيقة.</p> : null}
        {shown && report ? (
          <LabReportView report={report} compounds={shown.input.compounds} model={shown.model} />
        ) : null}
        {shown && !report ? <RawAnswer content={shown.content} /> : null}
      </div>
    </div>
  );
}
