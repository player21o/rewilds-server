import config from "./config";
import { GameServer } from "./game";
import { LobbyServer } from "./lobby";

const lobby = new LobbyServer();
const game = new GameServer(
  config.game.port,
  config.game.tickrate,
  config.game.updates_tickrate
);
