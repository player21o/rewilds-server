import config from "./config";
import { GameServer } from "./game";
import { LobbyServer } from "./lobby";

const lobby = new LobbyServer();
const game = new GameServer(8001, config.game.tickrate);
