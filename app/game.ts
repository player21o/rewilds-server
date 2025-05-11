// game.ts
import { decode, encode } from "@msgpack/msgpack";
import { App, DISABLED } from "uWebSockets.js";
import {
  constructors_inner_keys,
  constructors_keys,
  constructors_object,
  ConstructorsInnerTypes,
  ConstructorsObject,
} from "./common/constructors";
import packets, { Peer, Ws } from "./game/packets/packets";
import { EntitiesManager } from "./game/entities";
import { Citizen } from "./game/entities/citizen";

export class GameServer {
  private peers: Peer[] = [];
  private peer_id_count: number = 0;
  private peer_ids: { [id: number]: Peer } = {};
  private entities = new EntitiesManager();

  private last_time: number = Date.now();

  constructor(port: number, tickrate: number) {
    this.game_loop(tickrate);

    App({})
      .ws("/*", {
        compression: DISABLED,
        open: (ws: Ws) => {
          const peer: Peer = {
            send: (msg, ...args) => {
              this.send(peer.id, msg, ...args);
            },
            id: this.peer_id_count,
            ws: ws,
          };

          ws.id = peer.id;
          ws.subscribe("global");

          this.peers.push(peer);
          this.peer_ids[ws.id!] = peer;
          this.peer_id_count += 1;

          const citizen = new Citizen("hui", 0, 0);
          this.entities.add(citizen);

          //peer.send("update", [[1, 2, 3]]);
          setTimeout(() => peer.send("hello"), 1000);
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

          packets[constructor_name](this.peer_ids[ws.id!], formatted as any);
        },
      })
      .listen(port, () => {});
  }

  private send<T extends keyof ConstructorsObject>(
    peer_id: keyof typeof this.peer_ids,
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    const peer = this.peer_ids[peer_id];
    const constructor = constructors_object[msg];

    const data = constructors_inner_keys[msg].map((prop, i) => {
      const propName = prop as keyof typeof constructor;
      const converterPair = constructor[propName] as readonly [
        (val: any) => any,
        (val: any) => any
      ];

      return converterPair[0](args[i]);
    });

    //console.log(encode([constructors_keys.indexOf(msg), data]));

    peer.ws.send(encode([constructors_keys.indexOf(msg), data]), true);
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
    }, 1000 / ticks);
  }
}
