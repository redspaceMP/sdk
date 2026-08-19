// Freeroam server resource.
//
// Runs inside the RedSpaceM scripting host (QuickJS). The `mp` global API
// (mp.players, mp.vehicles, mp.events, ...) is provided by the host; typed
// definitions ship via @redspacem/server-types.

import type { Mp, MpPlayer } from "@redspacem/server-types";

export const VERSION = "0.1.0";

/** Resource entry point: wires event handlers and commands onto `mp`. */
export function main(mp: Mp): void {
  console.log("[freeroam] resource loaded");
  mp.events.on("playerJoin", onPlayerJoin);
  mp.events.on("chatMessage", onChatMessage);
  mp.commands.register("hello", (player: MpPlayer) => {
    mp.log("info", `Hello, ${player.name}!`);
  });
}

export function onPlayerJoin(player: MpPlayer): void {
  console.log(`[freeroam] ${player.name} (id=${player.id}) joined`);
}

export function onChatMessage(payload: { from: number; text: string }): void {
  console.log(`[freeroam] chat from ${payload.from}: ${payload.text}`);
}
