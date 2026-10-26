import Link from "next/link";
import { DISPUTE_TYPES } from "@/lib/disputes";

const STEPS = [
  {
    n: "1",
    title: "Pick what happened",
    body: "A platform penalty, a cancelled order, a late delivery -- choose the defense that matches your side.",
  },
  {
    n: "2",
    title: "Add your evidence",
    body: "Photograph the proof. Can't type it out? Just speak -- in your own language.",
  },
  {
    n: "3",
    title: "SAM 3.1 checks it, Muse Spark writes it",
    body: "The photo is verified against your claim before anything is drafted. You get a ready-to-submit appeal, not a guess.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div className="space-y-6">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-primary bg-primary-tint px-3 py-1 rounded-full">
            For delivery &amp; rideshare workers
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Your side of the story, backed by proof.
          </h1>
          <p className="text-lg text-muted max-w-md">
            Platforms penalize drivers on a customer&apos;s word alone. Insaaf checks your
            evidence photo with SAM 3.1 before Muse Spark drafts the appeal -- so what you
            submit is verified, not just typed.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/file" className="btn-primary px-6 py-3 text-base">
              File a case
            </Link>
            <Link href="/cases" className="btn-secondary px-6 py-3 text-base">
              My appeals
            </Link>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Common defenses Insaaf verifies
          </p>
          {DISPUTE_TYPES.slice(0, 4).map((d) => (
            <div
              key={d.id}
              className="flex items-start gap-3 rounded-xl border border-border px-3 py-2.5"
            >
              <span className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">{d.label}</p>
                <p className="text-xs text-muted">against: {d.platformClaim}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-14 grid sm:grid-cols-3 gap-6">
        {STEPS.map((s) => (
          <div key={s.n} className="space-y-2">
            <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              {s.n}
            </div>
            <h3 className="font-bold">{s.title}</h3>
            <p className="text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="card p-6 sm:p-8 bg-primary-tint border-primary/20">
          <p className="text-sm font-semibold text-primary mb-1">Why this exists</p>
          <p className="text-foreground/90">
            A locked gate, a flooded street, a flat tyre -- real reasons drivers lose pay or
            get deactivated over. Insaaf doesn&apos;t take your word for it either: it checks
            the photo first, then writes the appeal only on what the evidence actually shows.
          </p>
        </div>
      </section>
    </main>
  );
}
