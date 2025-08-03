import { type Player, world } from "@minecraft/server";

export function getScore(score_name: string, player_name: Player) {
  try {
    const scoreboard = world.scoreboard;
    const objective = scoreboard.getObjective(score_name);
    if (
      objective === undefined ||
      player_name.scoreboardIdentity === undefined
    ) {
      throw new Error("scoreboardが定義されていないかも？");
    }
    const score = objective?.getScore(player_name.scoreboardIdentity);
    if (score === undefined) {
      throw new Error("scoreboardが定義されていないかも？");
    }
    return score;
  } catch {
    return 0; //scoreboardが定義されていないかも？
  }
}

export function setScore(
  score_name: string,
  player_name: Player,
  score: number,
) {
  try {
    const scoreboard = world.scoreboard;
    const objective = scoreboard.getObjective(score_name);
    if (
      objective === undefined ||
      player_name.scoreboardIdentity === undefined
    ) {
      throw new Error("scoreboardが定義されていないかも？");
    }
    objective?.setScore(player_name.scoreboardIdentity, score);
  } catch {
    return; //scoreboardが定義されていないかも？
  }
}

export function removeScore(
  score_name: string,
  player_name: Player,
  score: number,
) {
  try {
    const scoreboard = world.scoreboard;
    const objective = scoreboard.getObjective(score_name);
    if (
      objective === undefined ||
      player_name.scoreboardIdentity === undefined
    ) {
      throw new Error("scoreboardが定義されていないかも？");
    }
    objective?.setScore(
      player_name.scoreboardIdentity,
      getScore(score_name, player_name) - score,
    );
  } catch {
    return; //scoreboardが定義されていないかも？
  }
}

export function resetScore(score_name: string, player_name: Player) {
  try {
    const scoreboard = world.scoreboard;
    const objective = scoreboard.getObjective(score_name);
    if (
      objective === undefined ||
      player_name.scoreboardIdentity === undefined
    ) {
      throw new Error("scoreboardが定義されていないかも？");
    }
    objective?.setScore(player_name.scoreboardIdentity, 0);
  } catch {
    return; //scoreboardが定義されていないかも？
  }
}

export function resetScoreAll(score_name: string) {
  try {
    const scoreboard = world.scoreboard;
    const objective = scoreboard.getObjective(score_name);
    if (objective === undefined) {
      throw new Error("scoreboardが定義されていないかも？");
    }
    for (const player of world.getPlayers()) {
      if (player.scoreboardIdentity === undefined) {
        throw new Error("scoreboardが定義されていないかも？");
      }
      objective?.setScore(player.scoreboardIdentity, 0);
    }
  } catch {
    return; //scoreboardが定義されていないかも？
  }
}
