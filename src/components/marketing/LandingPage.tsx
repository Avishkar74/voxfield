"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mic,
  Wifi,
  WifiOff,
  ClipboardList,
  FileSearch,
  ShieldAlert,
  Activity,
  ArrowRight,
  AudioLines,
  Brain,
  Volume2,
  CheckCircle2,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const features = [
  {
    icon: Mic,
    title: "Voice-First Operations",
    desc: "Log work, query equipment history, and file inspections hands-free — built for the field, not the desk.",
  },
  {
    icon: WifiOff,
    title: "Offline-First PWA",
    desc: "Keep working with no signal. Voice notes and reports queue locally and sync automatically on reconnect.",
  },
  {
    icon: ClipboardList,
    title: "Work Orders & Inspections",
    desc: "Create, assign, and track work orders and inspection reports across your whole asset base.",
  },
  {
    icon: ShieldAlert,
    title: "Critical Alerts",
    desc: "Supervisors get a live, filterable view of high-severity alerts and the equipment that needs attention.",
  },
  {
    icon: Brain,
    title: "AI Maintenance Agent",
    desc: "An assistant that understands equipment codes, repair history, and acts on natural-language commands.",
  },
  {
    icon: Activity,
    title: "Full Audit Trail",
    desc: "Every voice interaction, action, and operation is logged for review, auditing, and operational insight.",
  },
];

const pipeline = [
  { icon: AudioLines, label: "Listening", desc: "Capture the technician's voice with live waveform feedback." },
  { icon: FileSearch, label: "Transcribing", desc: "Words appear as they speak, powered by streaming speech-to-text." },
  { icon: Brain, label: "Thinking", desc: "The agent interprets intent against live equipment data." },
  { icon: Volume2, label: "Speaking", desc: "A natural spoken response closes the loop, hands-free." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0E0C0A] text-white antialiased overflow-x-hidden">
      {/* Ambient gradient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-[#D14923]/20 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-[#D14923]/10 blur-[140px]" />
      </div>

      {/* Nav */}
      <header className="relative z-20">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-[#D14923] p-2 text-white shadow-lg shadow-[#D14923]/30">
              <Mic className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">VoxField</span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
            <a href="#overview" className="transition hover:text-white">Overview</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#workflow" className="transition hover:text-white">Workflow</a>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white hover:text-[#0E0C0A]"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 text-center md:pt-24">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/70"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#39FF14]" />
          Voice-first field operations
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="show"
          custom={1}
          variants={fadeUp}
          className="mx-auto max-w-4xl font-serif text-4xl font-medium leading-[1.1] tracking-tight md:text-6xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          The voice assistant for{" "}
          <span className="text-[#D14923]">field service</span> and asset maintenance
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="show"
          custom={2}
          variants={fadeUp}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg"
        >
          Technicians log work, query equipment, and file inspections by voice — even offline.
          Supervisors get a live operational picture across every asset, work order, and alert.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          custom={3}
          variants={fadeUp}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-full bg-[#D14923] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#D14923]/30 transition hover:bg-[#B73D1C]"
          >
            Launch the app
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/80 transition hover:bg-white/5"
          >
            Explore features
          </a>
        </motion.div>

        {/* Hero stat strip */}
        <motion.div
          initial="hidden"
          animate="show"
          custom={4}
          variants={fadeUp}
          className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { k: "Hands-free", v: "Voice UX" },
            { k: "Offline", v: "PWA ready" },
            { k: "Realtime", v: "Transcription" },
            { k: "Live", v: "Alerts" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
              <p className="text-lg font-bold text-white">{s.k}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-white/50">{s.v}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Overview */}
      <section id="overview" className="relative z-10 border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#D14923]">Project overview</p>
            <h2 className="font-serif text-3xl font-medium md:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
              Built for technicians who can't stop to type
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/60">
              VoxField pairs a natural-language AI agent with an offline-first progressive web app.
              In the field, technicians speak; in the control room, supervisors see every action
              reflected in real time — inspections, work orders, repair history, and critical alerts.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#D14923]">Features</p>
            <h2 className="font-serif text-3xl font-medium md:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
              Everything the field and the office need
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition hover:border-[#D14923]/40 hover:bg-white/[0.05]"
                >
                  <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-[#D14923]/10 p-3 text-[#D14923] transition group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-white/55">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Voice-first workflow */}
      <section id="workflow" className="relative z-10 border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#D14923]">Voice-first workflow</p>
            <h2 className="font-serif text-3xl font-medium md:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
              One natural conversation, four states
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-white/55">
              Tap once and speak. VoxField guides every interaction through a clear, unified pipeline.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
            {pipeline.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.label}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D14923]/15 text-[#D14923]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/40">Step {i + 1}</div>
                  <h3 className="mb-2 text-base font-bold">{p.label}</h3>
                  <p className="text-xs leading-relaxed text-white/55">{p.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#D14923]/20 via-white/[0.04] to-transparent p-10 text-center md:p-16"
          >
            <h2 className="font-serif text-3xl font-medium md:text-5xl" style={{ fontFamily: "Georgia, serif" }}>
              Ready to go hands-free?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
              Sign in to start logging work, querying equipment, and monitoring operations by voice.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-white/70">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#39FF14]" /> Works offline</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#39FF14]" /> Installable PWA</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#39FF14]" /> Realtime transcription</span>
            </div>
            <Link
              href="/login"
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-[#D14923] px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-[#D14923]/30 transition hover:bg-[#B73D1C]"
            >
              Launch VoxField
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-white/40 sm:flex-row">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#D14923]" />
            <span className="font-semibold text-white/70">VoxField</span>
          </div>
          <p>© 2026 VoxField · Voice Assistant for Field Operations</p>
          <div className="flex items-center gap-1.5 text-white/40">
            <Wifi className="h-4 w-4" /> Offline-first
          </div>
        </div>
      </footer>
    </div>
  );
}
