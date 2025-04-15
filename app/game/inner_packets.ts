import { WebSocket } from "uWebSockets.js";

type InnerPackets = { [key: string]: (ws: Ws, ...args: any[]) => void };
export type Ws = WebSocket<unknown> & { id?: number };

export const inner_packets = {
  pointer: (ws, x: number, y: number) => {},
  hello: (
    ws,
    {}: { mode: "fun"; seat_id: string; url: string; gender: 0 | 1 }
  ) => {
    console.log("received hello packet from " + ws.id?.toString());
    //console.log(seat_id);
  },
} as InnerPackets;
