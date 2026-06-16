import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";
import { requireAuth } from "@/lib/api/middleware";
import { createClient } from "@/lib/supabase/server";

const aai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // Build word boost list for custom vocabulary optimization
    let wordBoost: string[] = [
      "work order", "inspection", "technician", "supervisor", "repair", "history",
      "HVAC", "compressor", "generator", "chiller", "motor", "hydraulic", "pump", "WO"
    ];

    try {
      const supabase = await createClient();
      if (supabase && typeof supabase.from === "function") {
        const { data: equipmentList } = await supabase
          .from("equipment")
          .select("equipment_code");
        if (equipmentList && equipmentList.length > 0) {
          const codes = equipmentList.map((e: any) => e.equipment_code).filter(Boolean);
          wordBoost = [...wordBoost, ...codes];
        }
      }
    } catch (dbError) {
      console.warn("STT: Failed to fetch equipment codes for word_boost, using static list:", dbError);
    }

    const transcript = await aai.transcripts.transcribe({
      audio: buffer,
      language_code: "en",
      word_boost: wordBoost,
      boost_param: "high",
    });

    if (transcript.status === "error") {
      throw new Error(transcript.error);
    }

    return NextResponse.json({
      text: transcript.text,
      confidence: transcript.confidence,
    }, { status: 200 });
  } catch (error: any) {
    console.error("STT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
