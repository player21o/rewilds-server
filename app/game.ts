// game.ts
import { decode, encode } from "@msgpack/msgpack";
import { App, DISABLED } from "uWebSockets.js";
import { Peer, outer_packets } from "./game/outer_packets";
import { Ws, inner_packets } from "./game/inner_packets";
import { Entity } from "./game/entities/entity";
import { constructors, Constructors } from "./common/constructors";

export class GameServer {
  private peers: Peer[] = [];
  private peer_id_count: number = 0;
  private entities: Entity[] = [];
  private last_entities: { [sid: number]: Constructors[keyof Constructors] } =
    [];

  private last_time: number = Date.now();

  constructor(port: number, tickrate: number) {
    this.game_loop(tickrate);

    App({})
      .ws("/*", {
        compression: DISABLED,
        open: (ws: Ws) => {
          this.peers.push({
            send: (msg) => {
              ws.send(encode(msg), true);
            },
          });

          this.peers[0].send(
            outer_packets.say(true, "Hey! If you see this, everything works!")
          );

          ws.id = this.peer_id_count;

          this.peer_id_count += 1;
        },
        message: (ws: Ws, msg) => {
          const packet: [keyof typeof inner_packets, any] = decode(msg) as any;
          //console.log(packet);
          inner_packets[packet[0]](
            ws,
            typeof packet[1] === "object" &&
              !Array.isArray(packet[1]) &&
              packet[1] !== null
              ? packet[1]
              : [...packet[1]]
          );
        },
      })
      .listen(port, () => {});
  }

  private game_loop(ticks: number) {
    setInterval(() => {
      const dt = Date.now() - this.last_time;

      this.entities.forEach((entity) => {
        const desc = {};

        //constructors.

        //this.last_entities[entity.sid] = entity.step(dt);
      });

      this.last_time = Date.now();
    }, 1000 / ticks);
  }
}
