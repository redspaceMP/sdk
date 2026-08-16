// Freeroam server resource.
//
// Runs inside the RedSpaceM scripting host (QuickJS). The `mp` global API
// (mp.players, mp.vehicles, mp.events, ...) is provided by the host; typed
// definitions ship via @redspacem/server-types.

import type { MpPlayer } from "@redspacem/server-types";

export const VERSION = "0.1.0";

export function main(): void {
  console.log("[freeroam] resource loaded");
}

export function onPlayerJoin(player: MpPlayer): void {
  console.log(`[freeroam] ${player.name} (id=${player.id}) joined`);
}

export function onChatMessage(from: number, text: string): void {
  console.log(`[freeroam] chat from ${from}: ${text}`);
}
