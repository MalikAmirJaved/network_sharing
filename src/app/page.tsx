import {
  ArrowRight,
  Clock3,
  Infinity as InfinityIcon,
  KeyRound,
  Link2,
  MessageSquareText,
  MonitorSmartphone,
  QrCode,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { RoomEntry } from "@/components/landing/room-entry";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const features = [
  {
    icon: Zap,
    title: "LAN-fast",
    description:
      "Traffic goes straight across your local network — not through a data center on the other side of the world.",
    accent: "text-amber-400",
  },
  {
    icon: InfinityIcon,
    title: "No file limits",
    description:
      "Uploads stream straight to disk with backpressure, so a 40 GB folder behaves as calmly as a 40 KB note.",
    accent: "text-accent-2",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    description:
      "Optional PINs, hashed with scrypt. Rooms expire on your schedule. Nothing is sent to a third party.",
    accent: "text-success",
  },
  {
    icon: MonitorSmartphone,
    title: "Every device",
    description:
      "Laptop, phone, tablet, TV browser. Scan the QR code and the room opens instantly — no app install.",
    accent: "text-accent",
  },
  {
    icon: MessageSquareText,
    title: "More than files",
    description:
      "Send text notes, links, screenshots from the clipboard, or a whole batch of files in one drop.",
    accent: "text-pink-400",
  },
  {
    icon: Users,
    title: "Live presence",
    description:
      "See who is in the room in real time. New shares appear instantly on every connected device.",
    accent: "text-orange-400",
  },
];

const steps = [
  {
    number: "01",
    title: "Create a room",
    description:
      "Give it a name, add a PIN if you like, and choose when it should disappear.",
    icon: KeyRound,
  },
  {
    number: "02",
    title: "Invite your devices",
    description:
      "Share the 6-character code or let everyone scan the QR code from the room.",
    icon: QrCode,
  },
  {
    number: "03",
    title: "Drop anything",
    description:
      "Files, text, links, clipboard images — everything lands on every screen in real time.",
    icon: UploadCloud,
  },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Wordmark />
          <nav className="hidden items-center gap-1 text-sm text-muted md:flex">
            <a
              href="#features"
              className="rounded-lg px-3 py-2 transition-colors hover:bg-fg/5 hover:text-fg"
            >
              Features
            </a>
            <a
              href="#how"
              className="rounded-lg px-3 py-2 transition-colors hover:bg-fg/5 hover:text-fg"
            >
              How it works
            </a>
            <a
              href="#security"
              className="rounded-lg px-3 py-2 transition-colors hover:bg-fg/5 hover:text-fg"
            >
              Security
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="#create" className="btn btn-ghost hidden h-9 px-3.5 sm:inline-flex">
              Open a room
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:pt-16 lg:pb-28 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1.5 text-[0.72rem] font-medium text-muted backdrop-blur">
                <span className="live-dot" />
                Private by design · Runs on your LAN
              </div>

              <h1 className="mt-6 max-w-2xl text-[2.8rem] font-semibold leading-[1.03] tracking-[-0.04em] sm:text-6xl lg:text-[4.4rem]">
                Share anything.
                <br />
                <span className="gradient-text">Across any device.</span>
                <br />
                In seconds.
              </h1>

              <p className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-muted sm:text-lg">
                Netword turns your local network into a private sharing space.
                Drop files, text, and links — instantly available to everyone in
                the room. No accounts, no cloud, no upload limits.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  ["No cloud", Wifi],
                  ["No size limits", InfinityIcon],
                  ["PIN-protected", KeyRound],
                  ["Auto-expiring", Clock3],
                ].map(([label, Icon]) => (
                  <span key={label as string} className="chip">
                    <Icon className="h-3.5 w-3.5 text-accent" />
                    {label as string}
                  </span>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
                <div>
                  <p className="text-xl font-semibold tracking-tight">0</p>
                  <p className="text-xs text-faint">upload limits</p>
                </div>
                <div className="h-8 w-px bg-line" />
                <div>
                  <p className="text-xl font-semibold tracking-tight">LAN</p>
                  <p className="text-xs text-faint">speed transfers</p>
                </div>
                <div className="h-8 w-px bg-line" />
                <div>
                  <p className="text-xl font-semibold tracking-tight">1 tap</p>
                  <p className="text-xs text-faint">to join with QR</p>
                </div>
              </div>
            </div>

            <div id="create" className="scroll-mt-24">
              <RoomEntry />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-line/60 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Built for real sharing
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything you need. Nothing in the middle.
              </h2>
              <p className="mt-4 text-muted">
                Most sharing tools move your files through someone else&apos;s
                servers. Netword keeps the whole conversation on your network.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group surface-card rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg-soft/60">
                    <feature.icon className={`h-5 w-5 ${feature.accent}`} />
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-t border-line/60 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-2">
                  How it works
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Three steps. That&apos;s the whole product.
                </h2>
              </div>
              <a
                href="#create"
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-2"
              >
                Start a room <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="relative overflow-hidden rounded-2xl border border-line bg-surface/50 p-6 backdrop-blur"
                >
                  <span className="pointer-events-none absolute -right-2 -top-4 text-[5.5rem] font-bold leading-none text-fg/[0.04]">
                    {step.number}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent-2/20 text-accent ring-1 ring-accent/20">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="security"
          className="scroll-mt-20 border-t border-line/60 py-20"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
                Security, not theatre
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your files stay yours.
              </h2>
              <p className="mt-4 max-w-lg text-muted">
                Netword is self-hosted by design. The server is a folder on your
                machine, and every byte travels over the network you already
                trust.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  {
                    title: "LAN-only by default",
                    description:
                      "Bind to your network interface and share with devices on the same Wi-Fi or Ethernet.",
                  },
                  {
                    title: "Hashed PINs, signed sessions",
                    description:
                      "PINs are stored with scrypt. Session cookies are httpOnly, signed, and never readable by scripts.",
                  },
                  {
                    title: "Rooms that disappear",
                    description:
                      "Set an expiry and the room, metadata, and files are wiped automatically by the cleanup worker.",
                  },
                  {
                    title: "No third-party trackers",
                    description:
                      "No analytics, no CDN, no external fonts. The UI is fully self-hosted with the app.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success ring-1 ring-success/20">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-accent/20 to-accent-2/20 blur-2xl"
              />
              <div className="surface-card relative rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-faint">Room</p>
                    <p className="mt-1 text-lg font-semibold">Design team</p>
                  </div>
                  <span className="chip">
                    <span className="live-dot" /> 4 online
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-dashed border-line-strong bg-bg-soft/50 px-4 py-4">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.16em] text-faint">
                      Room code
                    </p>
                    <p className="code-chip mt-1 text-2xl font-semibold text-fg">
                      K7M2QX
                    </p>
                  </div>
                  <div className="grid h-16 w-16 grid-cols-4 gap-1 rounded-xl bg-white p-2">
                    {Array.from({ length: 16 }).map((_, index) => (
                      <span
                        key={index}
                        className={
                          index % 3 === 0 || index % 5 === 0
                            ? "rounded-[1px] bg-slate-900"
                            : "rounded-[1px] bg-slate-200"
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
                    <p className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-faint">
                      <KeyRound className="h-3 w-3" /> PIN
                    </p>
                    <p className="mt-1.5 font-mono text-sm tracking-[0.2em]">
                      ••••
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
                    <p className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-faint">
                      <Clock3 className="h-3 w-3" /> Expires
                    </p>
                    <p className="mt-1.5 text-sm font-semibold">in 23 h</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    ["Amber Fox", "shared launch-plan.pdf", "2.4 MB"],
                    ["Blue Otter", "sent a text note", "just now"],
                    ["Jade Lynx", "shared a link", "1 min ago"],
                  ].map(([author, action, meta]) => (
                    <div
                      key={author}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2.5"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-[0.6rem] font-semibold text-white">
                        {author
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{author}</p>
                        <p className="truncate text-[0.68rem] text-muted">
                          {action}
                        </p>
                      </div>
                      <span className="text-[0.65rem] text-faint">{meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line/60 py-20">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent-2/20 ring-1 ring-accent/20">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your network. Your files. Your rules.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Spin up a room in under five seconds. It stays on your machines,
              and it disappears when you&apos;re done.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href="#create" className="btn btn-primary h-11 px-6">
                Create a room <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#how" className="btn btn-ghost h-11 px-6">
                See how it works
              </a>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-faint">
              <Link2 className="h-3.5 w-3.5" />
              Works on any device with a browser
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-faint sm:flex-row">
          <Wordmark markClassName="h-8 w-8" />
          <p className="text-center text-xs">
            Self-hosted · Built with Next.js · Your files never leave your
            network.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <a href="#features" className="transition-colors hover:text-fg">
              Features
            </a>
            <a href="#security" className="transition-colors hover:text-fg">
              Security
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
