// game.ts
import { decode, encode } from "@msgpack/msgpack";
import { App, DISABLED } from "uWebSockets.js";
import { Entity } from "./game/entities/entity";
import {
  constructors_inner_keys,
  constructors_keys,
  constructors_object,
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
              const constructor = constructors_object[msg];

              const data = constructors_inner_keys[msg].map((prop, i) => {
                const propName = prop as keyof typeof constructor;
                const converterPair = constructor[propName] as readonly [
                  (val: any) => any,
                  (val: any) => any
                ];

                return converterPair[0](args[i]);
              });

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

          const formatted: any[] = [];
          const sliced = packet.slice(1);
          const constructor_name = constructors_keys[packet[0]];
          const constructor = constructors_object[constructor_name];
          const props = constructors_inner_keys[constructor_name];

          for (let i = 0, n = sliced.length; i < n; ++i) {
            const propName = props[i] as keyof typeof constructor;
            const converterPair = constructor[propName] as readonly [
              (val: any) => any,
              (val: any) => any
            ];

            formatted.push(converterPair[1](sliced[i]));
          }

          packets[constructor_name](ws, formatted as any);
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
