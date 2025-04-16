// game.ts
import { decode, encode } from "@msgpack/msgpack";
import { App, DISABLED } from "uWebSockets.js";
import { Entity } from "./game/entities/entity";
import { constructors } from "./common/constructors";
import packets, { Peer, Ws } from "./game/packets/packets";

export class GameServer {
  private peers: Peer[] = [];
  private peer_id_count: number = 0;
  private entities: Entity[] = [];

  private last_time: number = Date.now();

  constructor(port: number, tickrate: number) {
    this.game_loop(tickrate);

    App({})
      .ws("/*", {
        compression: DISABLED,
        open: (ws: Ws) => {
          this.peers.push({
            send: (msg, ...args) => {
              const data = Object.keys(constructors[msg]).map((attr, i) =>
                //@ts-ignore
                constructors[msg][
                  attr as keyof (typeof constructors)[keyof typeof constructors]
                ][0](args[i])
              );

              ws.send(encode(data), true);
            },
          });

          ws.id = this.peer_id_count;
          ws.subscribe("global");

          this.peer_id_count += 1;
        },
        message: (ws: Ws, msg) => {
          const packet: [
            packet: keyof typeof packets,
            ...args: Parameters<(typeof packets)[keyof typeof packets]>
          ] = decode(msg) as any;

          //packets[packet[0]](packet.slice(1))
          packets[packet[0]](ws, packet.slice(1) as any);
        },
      })
      .listen(port, () => {});
  }

  private game_loop(ticks: number) {
    setInterval(() => {
      const updates: [sid: number, props: any[], bits: number][] = [];

      const dt = Date.now() - this.last_time;

      this.entities.forEach((entity) => {
        const [props, bits] = entity.update(dt);

        if (bits != 0) updates.push([entity.sid, props, bits]);
      });

      this.last_time = Date.now();
    }, 1000 / ticks);
  }
}
