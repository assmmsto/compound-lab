import { useEffect, useState } from "react";
import { FlaskConical, Settings } from "lucide-react";
import { AboutDeveloper } from "@/components/about-developer";
import { HistoryPanel } from "@/components/history-panel";
import { LabPanel } from "@/components/lab-panel";
import { RawAnswer } from "@/components/reports";
import { SettingsDialog } from "@/components/settings-dialog";
import { quietBtn } from "@/components/ui";
import { usePharmacy } from "@/lib/pharmacy-store";
import { providerReady, type HistoryItem } from "@/lib/types";

/**
 * The whole app shell — ONE window: the compounding lab.
 *
 * There used to be three tabs (المختبر / البطاقة / السجل). The drug-name card
 * tab is gone on purpose: this product is a compound-mixing lab, not a drug
 * encyclopedia. History is no longer a tab either — it is a collapsible record
 * of past experiments living under the lab itself.
 *
 * Kept router-free on purpose: the TanStack route at src/routes/index.tsx
 * (hosted preview) and standalone/main.tsx (single file + APK) both mount this
 * component unchanged.
 */
export function Home() {
  const hydrate = usePharmacy((state) => state.hydrate);
  const provider = usePharmacy((state) => state.provider);
  const historyCount = usePharmacy((state) => state.history.length);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seed, setSeed] = useState<HistoryItem | null>(null);
  const [legacyCard, setLegacyCard] = useState<HistoryItem | null>(null);
  const ready = providerReady(provider);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  function openHistoryItem(item: HistoryItem) {
    // Old builds also stored drug-card entries. Those have no screen anymore,
    // so they are shown as stored text rather than silently dropped.
    if (item.kind === "lab") {
      setLegacyCard(null);
      setSeed(item);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setLegacyCard(item);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 pt-6 pb-24">
      <header className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-herb text-card">
            <FlaskConical className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold leading-tight">مختبر المركبات</h1>
              <span className="rounded-full bg-herb-soft px-2 py-0.5 text-[11px] font-medium text-herb">
                نسخة نتائج جديدة
              </span>
            </div>
            <p className="text-sm text-muted">
              ادمج المواد واقرأ بطاقة كاملة: ماذا ينتج، وماذا ترى بعينك، وهل يصلح ولمن، وما الضرر والبديل.
            </p>
          </div>
          <AboutDeveloper compact />
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-medium"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="size-4 shrink-0" aria-hidden />
          <span className="truncate" dir="ltr">
            {ready ? provider.model : "إعداد المزوّد"}
          </span>
        </button>
      </header>

      <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-pretty">
        <span className="font-semibold">تنبيه. </span>
        مرجع مساعد للصيدلي، وليس بديلاً عن النشرة أو المرجع المعتمد أو حكمك المهني. الجواب من النموذج الذي
        تختاره، وقد يخطئ.
      </p>

      <LabPanel
        seed={seed}
        onNeedSettings={() => {
          setSettingsOpen(true);
        }}
      />

      <details className="rounded-2xl border border-line bg-card px-4 py-3">
        <summary className="cursor-pointer list-none text-base font-semibold text-ink">
          السجل{historyCount > 0 ? <span className="text-herb"> ({historyCount})</span> : null}
          <span className="ms-2 text-sm font-normal text-muted">تجاربك السابقة على هذا الجهاز</span>
        </summary>
        <div className="pt-4">
          <HistoryPanel onOpen={openHistoryItem} />
        </div>
      </details>

      {legacyCard ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">بطاقة قديمة محفوظة</h2>
            <button type="button" className={quietBtn} onClick={() => setLegacyCard(null)}>
              إغلاق
            </button>
          </div>
          <RawAnswer content={legacyCard.content} />
        </section>
      ) : null}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  );
}
