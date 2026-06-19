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
        const height = 14 + Math.abs(Math.sin(phase)) * 46;
        bar.style.height = `${height}px`;
      });
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF9F5] flex flex-col">
      <nav className="w-full max-w-5xl mx-auto px-6 md:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#D14923] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
          <span className="text-[15px] font-medium tracking-tight text-[#1A1A1A] font-display">
            VoxField
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/login?mode=signin"
            className="px-4 py-2 bg-[#D14923] hover:bg-[#B73D1C] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="px-4 py-2 bg-[#D14923] hover:bg-[#B73D1C] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>

      <section className="flex-1 w-full max-w-5xl mx-auto px-6 md:px-8 flex flex-col items-center justify-center text-center py-20 md:py-28">
        <span className="inline-flex items-center gap-2 bg-[#FAF0ED] text-[#D14923] text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full border border-[#F0D9D1] mb-8">
          Built for the field, not the office
        </span>

        <h1 className="text-[2.75rem] md:text-[4rem] leading-[1.05] font-medium tracking-tight text-[#1A1A1A] max-w-3xl font-display">
          Talk to your equipment data.
          <br />
          <span className="text-[#D14923]">Skip the clipboard.</span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-[#57534E] max-w-xl leading-relaxed">
          VoxField lets field technicians log inspections, raise work orders,
          and check equipment history by voice — hands free, even offline.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login?mode=signup"
            className="px-7 py-3.5 bg-[#D14923] hover:bg-[#B73D1C] text-white text-sm font-semibold rounded-2xl transition-colors shadow-sm"
          >
            Get started
          </Link>
          <Link
            href="/login?mode=signin"
            className="px-7 py-3.5 bg-transparent hover:bg-white text-[#1A1A1A] text-sm font-semibold rounded-2xl border border-[#E5E1D8] transition-colors"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="flex items-end gap-1.5 h-16">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                ref={(el) => {
                  barsRef.current[i] = el;
                }}
                className="w-1.5 rounded-full bg-[#D14923]/70"
                style={{ height: "14px" }}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-[#A8A29E] uppercase tracking-widest">
            Tap to speak. VoxField handles the rest.
          </p>
        </div>
      </section>

      <section className="w-full max-w-5xl mx-auto px-6 md:px-8 py-16 md:py-20 border-t border-[#E5E1D8]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF0ED] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-[#D14923]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] font-display">
              Speak it, don&apos;t type it
            </h3>
            <p className="text-sm text-[#57534E] leading-relaxed max-w-[220px]">
              Log inspections and work orders by voice, hands free.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF0ED] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-[#D14923]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 18.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] font-display">
              Works without signal
            </h3>
            <p className="text-sm text-[#57534E] leading-relaxed max-w-[220px]">
              Keep working offline; everything syncs the moment you&apos;re back
              online.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF0ED] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-[#D14923]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] font-display">
              Ask your equipment history
            </h3>
            <p className="text-sm text-[#57534E] leading-relaxed max-w-[220px]">
              Query past work orders and equipment data in plain language.
            </p>
          </div>
        </div>
      </section>

      <footer className="w-full max-w-5xl mx-auto px-6 md:px-8 py-8 text-center">
        <p className="text-xs text-[#A8A29E]">
          VoxField — a voice-first assistant for field teams
        </p>
      </footer>
      <section className="w-full bg-[#1A1A1A] py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-medium text-white font-display">
            Stop typing. Start talking.
          </h2>
          <p className="mt-4 text-[#A8A29E] text-base leading-relaxed">
            Set up your first work order by voice in under two minutes.
          </p>
          <Link
            href="/login?mode=signup"
            className="mt-8 inline-block px-7 py-3.5 bg-[#D14923] hover:bg-[#B73D1C] text-white text-sm font-semibold rounded-2xl transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>
    </main>
  );
}
