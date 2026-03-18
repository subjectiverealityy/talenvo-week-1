// useWebSocket - real-time multi-user updates using Pusher Channels.
// Pusher is a managed WebSocket service that works on Vercel without a persistent server process.

// Architecture:
// - Client calls broadcast() after a local state mutation (optimistic UI)
// - broadcast() sends the event to /api/pusher which triggers it via Pusher
// - Pusher delivers the event to all other connected clients
// - Receiving clients apply the event to their local store (reconciliation)

// Conflict strategy: last-write-wins. The most recently received event is applied directly. In a production system with stronger consistency requirements, vector clocks or operational transforms would be used.

// To swap Pusher for another WebSocket provider (e.g. Supabase Realtime, Ably):
// - Replace PusherJS subscription with the provider's client SDK
// - Replace /api/pusher with the provider's server SDK
// - The store calls, event types and broadcast function signature stay the same

import { useEffect, useRef } from "react";
import PusherClient from "pusher-js";
import { useStore } from "@/store/store";
import type { RealtimeEvent } from "@/store/types";

const CHANNEL_NAME = "board-realtime";
const EVENT_NAME = "board-update";
// Unique per-tab ID to prevent a tab from applying its own broadcast
const TAB_ID = crypto.randomUUID();

let pusherClient: PusherClient | null = null;

function getPusherClient(): PusherClient {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClient;
}

export function useWebSocket() {
  const channelRef = useRef<ReturnType<PusherClient["subscribe"]> | null>(null);

  useEffect(() => {
    const client = getPusherClient();
    const channel = client.subscribe(CHANNEL_NAME);
    channelRef.current = channel;

    channel.bind(EVENT_NAME, (data: { tabId: string; event: RealtimeEvent }) => {
      // Ignore events sent by this tab
      if (data.tabId === TAB_ID) return;

      const store = useStore.getState();

      // Reconciliation — apply incoming events from other clients to local state.
      // Last-write-wins: the most recently received event is applied directly.
      switch (data.event.type) {
        case "CARD_CREATED":
          store.createCard(data.event.payload);
          break;
        case "CARD_MOVED":
          store.moveCard(data.event.payload);
          break;
        case "COMMENT_ADDED":
          store.createComment(data.event.payload);
          break;
      }
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(CHANNEL_NAME);
      channelRef.current = null;

      // Disconnect and clear the singleton client on unmount so that a fresh connection is created on the next mount. This prevents stale connections accumulating during hot reload in development.
      try {
        client.disconnect();
        pusherClient = null;
      } catch {
        // ignore
      }
    };
  }, []);

  return channelRef;
}

// Broadcast an event to all other clients via Pusher (called after local state has already been updated - optimistic UI pattern).
export async function broadcast(event: RealtimeEvent): Promise<void> {
  try {
    await fetch("/api/pusher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelName: CHANNEL_NAME,
        eventName: EVENT_NAME,
        data: { tabId: TAB_ID, event },
      }),
    });
  } catch (error) {
    console.error("Failed to broadcast event:", error);
  }
}