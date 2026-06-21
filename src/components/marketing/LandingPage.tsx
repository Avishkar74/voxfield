"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export function LandingPage() {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;
    let raf: number;

    const animate = () => {
      frame += 1;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const phase = frame * 0.04 + i * 0.6;
        const height = 6 + Math.abs(Math.sin(phase)) * 36;
        bar.style.height = `${height}px`;
      });
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "#FBF9F4", color: "#1A1A1A" }}>

      {/* Nav */}
      <nav
        className="w-full flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid #EEEBE3" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#D14923" }}
          >
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
          <span className="text-[15px] font-medium tracking-tight" style={{ color: "#1A1A1A" }}>
            VoxField
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login?mode=signin"
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ border: "1px solid #DEDAD1", color: "#1A1A1A", background: "transparent" }}
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ background: "#D14923", color: "#fff" }}
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <span
          className="inline-block text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full mb-8"
          style={{ border: "1px solid #F0D9D1", color: "#D14923", background: "#FDF4F1" }}
        >
          Built for the field, not the office
        </span>

        <h1
          className="text-[3rem] md:text-[4rem] leading-[1.1] font-normal max-w-2xl mb-6"
          style={{ letterSpacing: "-1.5px", fontFamily: "Georgia, serif", color: "#1A1A1A" }}
        >
          Talk to your equipment data.{" "}
          <em className="not-italic" style={{ color: "#D14923" }}>
            Skip the clipboard.
          </em>
        </h1>

        <p
          className="text-base md:text-lg leading-relaxed max-w-md mb-10"
          style={{ color: "#6B6860" }}
        >
          VoxField lets field technicians log inspections, raise work orders, and
          check equipment history by voice — hands free, even offline.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-20">
          <Link
            href="/login?mode=signup"
            className="px-7 py-3 text-sm rounded-xl transition-colors"
            style={{ background: "#D14923", color: "#fff" }}
          >
            Get started →
          </Link>
          <Link
            href="/login?mode=signin"
            className="px-7 py-3 text-sm rounded-xl transition-colors"
            style={{ border: "1px solid #DEDAD1", color: "#1A1A1A", background: "transparent" }}
          >
            I already have an account
          </Link>
        </div>

        {/* Waveform */}
        <div className="flex items-end justify-center gap-[3px] h-12 mb-3">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              ref={(el) => { barsRef.current[i] = el; }}
              className="w-[3px] rounded-full"
              style={{ height: "8px", background: "#D14923", opacity: 0.5 }}
            />
          ))}
        </div>
        <p
          className="text-[11px] uppercase tracking-widest"
          style={{ color: "#AAA8A0" }}
        >
          Tap to speak. VoxField handles the rest.
        </p>
      </section>

      {/* Feature cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-3"
        style={{ borderTop: "1px solid #EEEBE3", borderBottom: "1px solid #EEEBE3" }}
      >
        {[
          {
            title: "Speak it, don't type it",
            desc: "Log inspections and work orders by voice, completely hands free.",
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            ),
          },
          {
            title: "Works without signal",
            desc: "Keep working offline — everything syncs the moment you're back online.",
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 18.75h.008v.008H12v-.008z" />
              </svg>
            ),
          },
          {
            title: "Ask your equipment history",
            desc: "Query past work orders and equipment data in plain language.",
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            ),
          },
        ].map((feature, idx) => (
          <div
            key={idx}
            className="p-8 md:p-10"
            style={{
              borderRight: idx < 2 ? "1px solid #EEEBE3" : "none",
              color: "#6B6860",
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-5"
              style={{ border: "1px solid #F0D9D1", color: "#D14923", background: "#FDF4F1" }}
            >
              {feature.icon}
            </div>
            <h3 className="text-sm font-medium mb-2" style={{ color: "#1A1A1A" }}>
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <section
        className="w-full py-20 px-6 text-center"
        style={{ background: "#1A1A1A" }}
      >
        <h2
          className="text-3xl md:text-4xl font-normal mb-4"
          style={{ fontFamily: "Georgia, serif", color: "#FBF9F4", letterSpacing: "-0.8px" }}
        >
          Stop typing. Start talking.
        </h2>
        <p className="text-sm mb-8" style={{ color: "#888880" }}>
          Set up your first work order by voice in under two minutes.
        </p>
        <Link
          href="/login?mode=signup"
          className="inline-block px-7 py-3 text-sm font-medium rounded-xl transition-colors"
          style={{ background: "#D14923", color: "#fff" }}
        >
          Get started free
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="w-full py-6 text-center"
        style={{ background: "#1A1A1A", borderTop: "1px solid #2a2a2a" }}
      >
        <p className="text-xs" style={{ color: "#555" }}>
          VoxField — a voice-first assistant for field teams
        </p>
      </footer>
    </main>
  );
}