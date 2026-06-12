import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";
import { requireAuth } from "@/lib/api/middleware";

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

    const transcript = await aai.transcripts.transcribe({
      audio: buffer,
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
