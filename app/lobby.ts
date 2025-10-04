import config from "./config";
import { App } from "uWebSockets.js";

type Packet =
  //| ["set_location", string]
  //| ["date", number]
  //| ["set_flag", string]
  //| ["ask", { token: string; question: "captcha"; request_id: number }]
  //| ["play", { noob: boolean; mode: "fun"; mmtag: string; location: string }];
  ["play"];

export class LobbyServer {
  public constructor() {
    App({})
      .ws("/*", {
        message: (ws, message, _) => {
          const answer = (data: any) => ws.send(JSON.stringify(data));
          const data = JSON.parse(
            new TextDecoder("utf-8").decode(message) as any
          ) as Packet;

          switch (data[0]) {
            //case "ask":
            //  if (data[1].question == "captcha")
            //    answer(["response", { request_id: data[1].request_id }]); // no captcha lol
            //  break;
            case "play":
              answer([
                "game_ready",
                {
                  //mode: data[1].mode,
                  //seat_id: "no_idea_what_is_it_lol",
                  url: config.lobby.game_url,
                },
              ]);
              break;
          }
        },
      })
      .listen(config.lobby.port, () => {});
  }
}
