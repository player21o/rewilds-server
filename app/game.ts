// game.ts
import { App, DISABLED, TemplatedApp } from "uWebSockets.js";
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
import { pack, unpack } from "msgpackr";

export class GameServer {
  private peers: Peer[] = [];
  private peer_id_count: number = 0;
  private peer_ids: { [id: number]: Peer } = {};
  private entities = new EntitiesManager();

  private app: TemplatedApp;

  private last_time: number = Date.now();

  constructor(port: number, tickrate: number) {
    this.game_loop(tickrate);

    this.app = App({})
      .ws("/*", {
        compression: DISABLED,
        close: (ws: Ws) => {
          this.peers = this.peers.filter((p) => p.id != ws.id!);
          delete this.peer_ids[ws.id!];
        },
        open: (ws: Ws) => {
          const peer: Peer = {
            send: (msg, ...args) => {
              this.send(peer.id, msg, ...args);
            },
            id: this.peer_id_count,
            ws: ws,
            citizen: null,
          };

          ws.id = peer.id;
          ws.subscribe("global");

          this.peers.push(peer);
          this.peer_ids[ws.id!] = peer;
          this.peer_id_count += 1;

          const citizen = new Citizen(
            "hui",
            Math.random() * 50,
            Math.random() * 50
          );
          this.entities.add(citizen);
          peer.citizen = citizen;

          //peer.send("update", [[1, 2, 3]]);
          //console.log(this.entities.snapshot);
          setTimeout(() => {
            peer.send("snapshot", this.entities.snapshot);
            peer.send("your_sid", citizen.sid);
          }, 1000);
        },
        message: (ws: Ws, msg) => {
          const packet: [packet: number, any[]] = unpack(
            new Uint8Array(msg)
          ) as any;

          const formatted: any[] = [];
          const sliced = packet[1];
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

          packets[constructor_name](
            this.peer_ids[ws.id!],
            ...(formatted as any)
          );
        },
      })
      .listen(port, () => {});
  }

  private broadcast<T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    this.app.publish("global", pack(this.construct_packet(msg, ...args)), true);
  }

  private construct_packet<T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    const constructor = constructors_object[msg];

    const data = constructors_inner_keys[msg].map((prop, i) => {
      const propName = prop as keyof typeof constructor;
      const converterPair = constructor[propName] as readonly [
        (val: any) => any,
        (val: any) => any
      ];

      return converterPair[0](args[i]);
    });

    return [constructors_keys.indexOf(msg), data];
  }

  private send<T extends keyof ConstructorsObject>(
    peer_id: keyof typeof this.peer_ids,
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    if (this.peer_ids[peer_id] != undefined)
      this.peer_ids[peer_id].ws.send(
        pack(this.construct_packet(msg, ...args)),
        true
      );
  }

  private game_loop(ticks: number) {
    setInterval(() => {
      const updates: [sid: number, props: any[], bits: number][] = [];

      const dt = (Date.now() - this.last_time) / 1000;

      this.entities.forEach((entity) => {
        const [props, bits] = entity.update(dt);

        if (bits != 0) updates.push([entity.sid, props, bits]);
      });

      this.broadcast(
        "update",
        updates.map((u) => [u[0], u[2], ...u[1]])
      );

      this.last_time = Date.now();
    }, 1000 / ticks);
  }
}
