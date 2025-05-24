export default {
  lobby: {
    port: 8000,
    game_url: "ws://localhost:8002",
  },
  game: {
    port: 8002,
    tickrate: 30,
    updates_tickrate: 20,
  },
};
