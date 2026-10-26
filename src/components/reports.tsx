import { useState, type ReactNode } from "react";
import { CONFIDENCE_LABEL, EVIDENCE_LABEL, SEVERITY_LABEL, VERDICT_LABEL } from "@/lib/messages";
import {
  formatMg,
  formatNum,
  parseWeight,
  type CardReport,
  type Dosing,
  type LabReport,
  type Severity,
  type Verdict,
} from "@/lib/normalize";
import { Field, fieldClass } from "@/components/ui";

const tone: Record<Severity, string> = {
  major: "bg-danger-soft text-danger",
  moderate: "bg-brass-soft text-brass",
  minor: "bg-herb-soft text-herb",
  none: "bg-paper-deep text-muted",
  unknown: "bg-paper-deep text-ink",
};

const EMPTY = "لم تُذكر معلومة. الفراغ لا يعني الأمان.";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-sm font-semibold ${tone[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function RawAnswer({ content }: { content: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">تعذر ترتيب التقرير</h2>
      <p className="text-sm text-muted">هذا نص النموذج كما وصل. لا تعتمد عليه كبطاقة منظمة.</p>
      <pre className="font-sans text-sm whitespace-pre-wrap break-words text-ink">{content}</pre>
    </section>
  );
}

function Assumption({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="rounded-xl bg-paper-deep px-3 py-2 text-sm text-ink">
      <span className="font-semibold">افتراض القراءة: </span>
      {text}
    </p>
  );
}

export function LabReportView({
  report,
  compounds,
  model,
}: {
  report: LabReport;
  compounds: string[];
  model: string;
}) {
  const verdictTone: Record<Verdict, { box: string; word: string }> = {
    mix: { box: "bg-herb-soft", word: "text-herb" },
    caution: { box: "bg-brass-soft", word: "text-brass" },
    avoid: { box: "bg-danger-soft", word: "text-danger" },
    unknown: { box: "bg-paper-deep", word: "text-ink" },
  };
  const look = verdictTone[report.verdict];

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-card">
      {/* ① The decision — one line the pharmacist acts on. */}
      <header className={`flex flex-col gap-3 px-4 py-4 sm:px-5 ${look.box}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-2xl font-bold leading-none ${look.word}`}>{VERDICT_LABEL[report.verdict]}</span>
          <SeverityBadge severity={report.severity} />
          <span className="rounded-full bg-card/70 px-3 py-1 text-xs font-medium text-ink">
            {EVIDENCE_LABEL[report.evidence]}
          </span>
          <span className="rounded-full bg-card/70 px-3 py-1 text-xs font-medium text-ink">
            {CONFIDENCE_LABEL[report.confidence]}
          </span>
        </div>
        <h2 className="text-xl font-semibold leading-snug text-ink">{report.headline}</h2>
        <p className="text-sm text-muted">{compounds.join(" + ")}</p>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <Assumption text={report.assumption} />

        {/* ② What results from the mix. */}
        <LabBlock title="ماذا ينتج عن الدمج">
          <p className="whitespace-pre-wrap text-pretty text-ink">{report.product || EMPTY}</p>
        </LabBlock>

        {/* ③ What the eye sees in the vessel. */}
        <section className={`flex flex-col gap-2 rounded-xl px-3 py-3 ${look.box}`}>
          <h3 className="text-base font-semibold text-ink">ماذا سترى بعينك</h3>
          <p className="whitespace-pre-wrap text-pretty text-ink">
            {report.observation || "لا شيء مرئي متوقع."}
          </p>
        </section>

        {/* ④ Why. */}
        {report.mechanism ? (
          <LabBlock title="لماذا يحدث">
            <p className="whitespace-pre-wrap text-pretty text-ink">{report.mechanism}</p>
          </LabBlock>
        ) : null}

        {/* ⑤ How to prepare it, step by step with check points. */}
        {report.preparation.length > 0 ? (
          <LabBlock title="طريقة التحضير">
            <ol className="flex flex-col gap-3">
              {report.preparation.map((line, index) => (
                <li key={`prep-${index}`} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper-deep text-sm font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <span className="text-pretty">{line}</span>
                </li>
              ))}
            </ol>
          </LabBlock>
        ) : null}

        {/* ⑥ Shelf life of the result. */}
        {report.stability ? (
          <LabBlock title="الثبات والصلاحية">
            <p className="whitespace-pre-wrap text-pretty text-ink">{report.stability}</p>
          </LabBlock>
        ) : null}

        {/* ⑦ For whom / for whom not. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="flex flex-col gap-2 rounded-xl bg-herb-soft px-3 py-3">
            <h3 className="text-base font-semibold text-ink">يصلح لمن</h3>
            <Lines items={report.suitableFor} />
          </section>
          <section className="flex flex-col gap-2 rounded-xl bg-danger-soft px-3 py-3">
            <h3 className="text-base font-semibold text-ink">لا يصلح لمن</h3>
            <Lines items={report.unsuitableFor} />
          </section>
        </div>

        {/* ⑧ The damage. */}
        <LabBlock title="الضرر وكيف يظهر">
          <p className="whitespace-pre-wrap text-pretty text-ink">{report.harm || EMPTY}</p>
        </LabBlock>

        {/* ⑨ Safety and disposal. */}
        {report.safety.length > 0 ? (
          <LabBlock title="السلامة والمناولة والتخلص">
            <Lines items={report.safety} />
          </LabBlock>
        ) : null}

        {/* ⑩ Always a way out. */}
        {report.alternative ? (
          <section className="flex flex-col gap-2 rounded-xl bg-herb-soft px-3 py-3">
            <h3 className="text-base font-semibold text-ink">البديل</h3>
            <p className="whitespace-pre-wrap text-pretty text-ink">{report.alternative}</p>
          </section>
        ) : null}

        {report.result && report.result !== report.product ? (
          <LabBlock title="تفصيل إضافي">
            <p className="whitespace-pre-wrap text-pretty text-ink">{report.result}</p>
          </LabBlock>
        ) : null}

        {report.sections.length > 0 ? (
          <details className="rounded-xl bg-paper-deep px-3 py-3">
            <summary className="cursor-pointer text-sm font-semibold">تفاصيل أعمق</summary>
            <ol className="mt-3 flex flex-col gap-3">
              {report.sections.map((section, index) => (
                <li key={`${section.title}-${index}`} className="flex flex-col gap-1">
                  <h4 className="font-semibold text-ink">{section.title}</h4>
                  <p className="whitespace-pre-wrap text-pretty text-sm">{section.body || EMPTY}</p>
                </li>
              ))}
            </ol>
          </details>
        ) : null}

        {report.uncertainties ? (
          <p className="rounded-xl bg-brass-soft px-3 py-3 text-sm text-pretty text-ink">
            <span className="font-semibold">ما لم يُحسم: </span>
            {report.uncertainties}
          </p>
        ) : null}

        <ReportFoot model={model} />
      </div>
    </article>
  );
}

function LabBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-4">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-4">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Lines({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">{EMPTY}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2 text-pretty">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-herb" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-sm text-pretty">
      <span className="font-semibold">{label}: </span>
      {value}
    </p>
  );
}

function DoseLine({ label, mgPerKg, weight }: { label: string; mgPerKg: number | null; weight: number }) {
  if (mgPerKg === null) return null;
  const dose = weight * mgPerKg;
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <span className="text-sm text-muted">{label}</span>
      <p dir="ltr" className="text-end text-2xl font-semibold text-ink tabular-nums">
        {formatMg(dose)} mg
      </p>
      <p dir="ltr" className="text-end text-sm text-muted tabular-nums">
        {formatNum(weight)} kg × {formatNum(mgPerKg)} mg/kg
      </p>
    </div>
  );
}

function DoseCalculator({ dosing }: { dosing: Dosing }) {
  const [weight, setWeight] = useState("");
  const parsed = parseWeight(weight);
  const typed = weight.trim() !== "";
  const invalid = typed && parsed === null;
  const hasPerKg = dosing.perKgMin !== null || dosing.perKgUsual !== null || dosing.perKgMax !== null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-herb-soft p-4">
      <h3 className="text-base font-semibold text-ink">الجرعة حسب الوزن</h3>
      <Meta label="الطريق" value={dosing.route} />
      <Meta label="التكرار" value={dosing.frequency} />
      <Meta label="الحد اليومي" value={dosing.maxDaily} />
      <Meta label="جرعة البالغ" value={dosing.adultUsual} />
      <Meta label="ملاحظة الأطفال" value={dosing.pediatricNote} />
      <Meta label="تعديلات" value={dosing.adjustments} />
      <Meta label="ملاحظات الرقم" value={dosing.notes} />
      {hasPerKg ? (
        <>
          <Field label="وزن المريض بالكيلوغرام" htmlFor="patient-weight" hint="الحساب للجرعة الواحدة: الوزن × ملغ/كغ">
            <input
              id="patient-weight"
              className={fieldClass}
              inputMode="decimal"
              dir="ltr"
              placeholder="70"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </Field>
          {invalid ? <p className="text-sm text-danger">أدخل وزناً أكبر من صفر وحتى 400 كغ.</p> : null}
          {parsed !== null ? (
            <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
              <DoseLine label="الحد الأدنى" mgPerKg={dosing.perKgMin} weight={parsed} />
              <DoseLine label="الجرعة المعتادة" mgPerKg={dosing.perKgUsual} weight={parsed} />
              <DoseLine label="الحد الأقصى للجرعة" mgPerKg={dosing.perKgMax} weight={parsed} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">لا يوجد رقم ملغ/كغ في الرد. لا تُحسب جرعة من فراغ.</p>
      )}
      <p className="text-sm text-muted">
        حاسبة مراجعة فقط. طابق الناتج مع النشرة، والعمر، ووظيفة الكلية والكبد، وحكمك المهني.
      </p>
    </div>
  );
}

export function CardReportView({
  report,
  query,
  model,
}: {
  report: CardReport;
  query: string;
  model: string;
}) {
  const title = report.nameAr || query;
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-card px-4 py-4 sm:px-5">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-herb">بطاقة الدواء</p>
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        {report.nameLat ? (
          <p dir="ltr" className="text-end text-sm text-muted">
            {report.nameLat}
          </p>
        ) : null}
        {report.drugClass ? <p className="text-sm font-medium text-herb">{report.drugClass}</p> : null}
        <Assumption text={report.assumption} />
      </header>
      <Block title="شو هو">
        <p className="whitespace-pre-wrap text-pretty">{report.whatItIs || EMPTY}</p>
      </Block>
      <Block title="لشو يُستخدم">
        <Lines items={report.usedFor} />
      </Block>
      <Block title="التركيب الكيميائي">
        <p className="whitespace-pre-wrap text-pretty">{report.chemicalComposition || EMPTY}</p>
      </Block>
      <Block title="كيف يُصرف ويُوصف">
        <p className="whitespace-pre-wrap text-pretty">{report.howPrescribed || EMPTY}</p>
      </Block>
      <Block title="الإطراح والحركية">
        <p className="whitespace-pre-wrap text-pretty">{report.kinetics || EMPTY}</p>
      </Block>
      <Block title="موانع الإعطاء">
        <Lines items={report.contraindications} />
      </Block>
      <Block title="التداخل مع الطعام">
        <Lines items={report.foodInteractions} />
      </Block>
      <Block title="المعادن والمعقدات">
        {report.mineralComplexes.length === 0 ? (
          <p className="text-sm text-muted">{EMPTY}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {report.mineralComplexes.map((item, index) => (
              <li key={`${item.partner}-${index}`} className="rounded-xl bg-paper px-3 py-3">
                <p className="font-semibold">{item.partner}</p>
                {item.whatHappens ? <p className="text-pretty">{item.whatHappens}</p> : null}
                {item.advice ? <p className="text-sm text-herb">{item.advice}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="تداخلات دوائية مهمة">
        {report.drugInteractions.length === 0 ? (
          <p className="text-sm text-muted">{EMPTY}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {report.drugInteractions.map((item, index) => (
              <li key={`${item.with}-${index}`} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{item.with}</span>
                  <SeverityBadge severity={item.severity} />
                </div>
                {item.effect ? <p className="text-pretty">{item.effect}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="تحذيرات الإعطاء">
        <Lines items={report.administrationWarnings} />
      </Block>
      <Block title="الجرعة">
        <DoseCalculator dosing={report.dosing} />
      </Block>
      <Block title="ما لم يُحسم">
        <p className="text-pretty">{report.uncertainties || "لم يذكر النموذج نقطة غير محسومة إضافية."}</p>
      </Block>
      <ReportFoot model={model} />
    </article>
  );
}

function ReportFoot({ model }: { model: string }) {
  return (
    <p className="text-sm text-muted">
      المصدر: النموذج{" "}
      <bdi dir="ltr" className="font-medium">
        {model}
      </bdi>
      . راجع النشرة والمرجع المعتمد قبل أي قرار.
    </p>
  );
}
