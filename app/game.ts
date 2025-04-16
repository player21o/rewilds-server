// game.ts
import { decode, encode } from "@msgpack/msgpack";
import { App, DISABLED } from "uWebSockets.js";
import { Entity } from "./game/entities/entity";
import {
  constructors,
  constructors_inner_keys,
  constructors_keys,
} from "./common/constructors";
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
              const data = constructors_inner_keys[msg].map((attr, i) =>
                //@ts-ignore
                constructors[msg][
                  attr as keyof (typeof constructors)[keyof typeof constructors]
                ][0](args[i])
              );

              ws.send(encode([constructors_keys.indexOf(msg), data]), true);
            },
          });

          ws.id = this.peer_id_count;
          ws.subscribe("global");

          this.peer_id_count += 1;
        },
        message: (ws: Ws, msg) => {
          const packet: [
            packet: number,
            ...args: Parameters<(typeof packets)[keyof typeof packets]>
          ] = decode(msg) as any;

          const formatted = [];
          const sliced = packet.slice(1);
          const constructor = constructors_keys[packet[0]];
          const props = constructors_inner_keys[constructor];

          for (let i = 0, n = sliced.length; i < n; ++i) {
            formatted.push(
              //@ts-ignore
              constructors[constructor][
                props[i] as keyof (typeof constructors)[typeof constructor]
              ][1](sliced[i])
            );
          }

          packets[constructor](ws, formatted as any);
        },
      })
      .listen(port, () => {});
  }

  private game_loop(ticks: number) {
    setInterval(() => {
      const updates: [sid: number, props: any[], bits: number][] = [];

      const dt = (Date.now() - this.last_time) / 1000;

      this.entities.forEach((entity) => {
        const [props, bits] = entity.update(dt);

        if (bits != 0) updates.push([entity.sid, props, bits]);
      });

      this.last_time = Date.now();

      console.log(dt);
    }, 1000 / ticks);
  }
}
