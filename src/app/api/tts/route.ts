import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth } from "@/lib/api/middleware";

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const mp3 = await getOpenAI().audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
