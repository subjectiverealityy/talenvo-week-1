// Pusher API route - server-side endpoint that receives broadcast events from the client and triggers them via Pusher's server SDK. 
// Pusher's secret key must never be exposed to the browser so all event triggers (Pusher calls) happen here on the server. The client only holds the public key and asks the server to trigger the event on its behalf (using the secret key, which is required to trigger events).

import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelName, eventName, data } = body;

    await pusher.trigger(channelName, eventName, data);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Pusher trigger error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}