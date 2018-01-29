import * as Mousetrap from "mousetrap";
import * as _ from "lodash";

/* ***** */
/* types */
/* ***** */
type Player = {
  position: Position;
  width;
  height;
  color;
  vx;
  jumping: null | {
    remainingBlocks: number;
  };
};
type Tile = { col: number; row: number; color: string };
type Position = { row: number; col: number };
type Level = {
  tiles: Array<Tile>;
  height: number;
  width: number;
  tileWidth: number;
  playerPosition: { row: number; col: number };
};
type State = {
  player: Player;
  selectedLevel: Level;
  pressedKeys: { [key: string]: boolean };
  colorblind: "red" | "green" | "blue" | null;
};
type LoadLevelAction = {
  type: "LOAD_LEVEL";
  level: number;
};
type TimestepAction = {
  type: "TIMESTEP";
  ts: number;
};
type KeyboardAction = {
  type: "KEYBOARD";
  key: "left" | "right" | "up" | "down" | "1" | "2" | "3";
  direction: "up" | "down";
};
type Action = LoadLevelAction | TimestepAction | KeyboardAction;

/* ********* */
/* constants */
/* ********* */
const LEVELS = loadLevels();
const BLOCK_SIZE = LEVELS[0].tileWidth;
const SCREEN_HEIGHT = LEVELS[0].height * BLOCK_SIZE; // TODO fix this
const SCREEN_WIDTH = LEVELS[0].width * BLOCK_SIZE;
const PLAYER_SPEED = 15;

const initialState: State = {
  player: {
    position: { row: 0, col: 0 },
    width: 32,
    height: 64,
    color: "black",
    vx: 0
  },
  selectedLevel: null,
  pressedKeys: {},
  colorblind: null
};

let state: State = initialState;

/* ******* */
/* helpers */
/* ******* */

function createCanvas({ height, width }) {
  const canvas = document.createElement("canvas");
  canvas.height = height;
  canvas.width = width;
  canvas.setAttribute("style", "border: 1px solid black");
  return canvas;
}

function dispatch(action) {
  state = reducer(state, action);
}

function getState(): State {
  return state;
}

function reducer(state: State = initialState, action: Action): State {
  return {
    ...state,
    selectedLevel: selectedLevelReducer(state.selectedLevel, action),
    player: playerReducer(state.player, action),
    colorblind: colorblindReducer(state.colorblind, action),
    pressedKeys: pressedKeysReducer(state.pressedKeys, action)
  };
}

function selectedLevelReducer(state, action) {
  if (action.type === "LOAD_LEVEL") {
    return LEVELS[action.level];
  }
  return state;
}

function playerReducer(state: Player, action) {
  if (action.type === "LOAD_LEVEL") {
    return { ...state, position: LEVELS[action.level].playerPosition };
  } else if (action.type == "KEYBOARD") {
    if (action.key === "up" && action.direction === "down" && !state.jumping) {
      return { ...state, jumping: { remainingBlocks: 100 } };
    }
  } else if (action.type === "TIMESTEP") {
    const pressedKeys = getState().pressedKeys;
    const dt = action.ts;

    let vx = 0;
    if (pressedKeys.right && !pressedKeys.left) {
      vx = 1;
    } else if (pressedKeys.left && !pressedKeys.right) {
      vx = -1;
    }

    let row;
    let jumping = { ...state.jumping };
    let blockChangeY = 0.001 * 1000 / dt;

    if (jumping && jumping.remainingBlocks > 0) {
      row = state.position.row + 10;
      jumping.remainingBlocks - 10;
    } else {
      console.log(state.position);
      console.log(blockChangeY);
      let nextTile = getTile(
        Math.ceil(state.position.row + blockChangeY),
        state.position.col
      );
      console.log(nextTile);
      if (nextTile) {
        if (canMove(nextTile)) {
          console.log("i can fall to to " + state.position.row + blockChangeY);
          row = state.position.row + blockChangeY;
        }
      } else {
        console.log("i cant move");
      }
    }

    const roundNext = vx > 0 ? Math.ceil : Math.floor; // round in the direction character is moving
    const roundPrev = vx > 0 ? Math.floor : Math.ceil;
    const nextTile = getTile(state.position.row, roundNext(state.position.col));
    const dx = canMove(nextTile) ? dt / 1000 * vx * PLAYER_SPEED : 0;

    let col = state.position.col + dx;
    // round down or up if cannot move to neighboring tile
    if (!canMove(getTile(state.position.row, roundNext(col)))) {
      col = roundPrev(col);
    }

    const position = { col, row: row };

    return { ...state, vx, position, jumping };
  }
  return state;
}

function pressedKeysReducer(state, action) {
  if (action.type !== "KEYBOARD") {
    return state;
  }

  if (action.direction === "down") {
    return { ...state, [action.key]: true };
  } else if (action.direction === "up") {
    return _.omit(state, action.key);
  }
}

const keyToColor = { "1": "red", "2": "green", "3": "blue" };
function colorblindReducer(state, action) {
  if (action.type === "LOAD_LEVEL") {
    return null;
  }
  if (
    action.type === "KEYBOARD" &&
    action.key in keyToColor &&
    action.direction === "down"
  ) {
    const color = keyToColor[action.key];
    return color === state ? null : color;
  }
  return state;
}

function l(...args) {
  console.log(...args);
}

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawTiles(tiles) {
  for (var tile of tiles) {
    drawRect(
      tile.col * BLOCK_SIZE,
      tile.row * BLOCK_SIZE,
      BLOCK_SIZE,
      BLOCK_SIZE,
      tile.color
    );
  }
}

const canvas = createCanvas({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
const ctx = canvas.getContext("2d");

function init() {
  // init keyboard bindings
  function createKeyboardAction(key, direction): KeyboardAction {
    return { type: "KEYBOARD", key, direction };
  }
  ["right", "left", "up", "down", "1", "2", "3"].forEach(key => {
    Mousetrap.bind(
      key,
      () => dispatch(createKeyboardAction(key, "down")),
      "keydown"
    );
    Mousetrap.bind(
      key,
      () => dispatch(createKeyboardAction(key, "up")),
      "keyup"
    );
  });

  dispatch({ type: "LOAD_LEVEL", level: 1 });
  document.body.appendChild(canvas);
  requestAnimationFrame(gameLoop);
}

function drawPlayer(player: Player) {
  drawRect(
    player.position.col * BLOCK_SIZE,
    player.position.row * BLOCK_SIZE,
    player.width,
    player.height,
    player.color
  );
}

function canMove(tile: Tile) {
  return (
    tile.color === "white" ||
    tile.color === state.colorblind ||
    tile.color === "orange"
  );
}

function getTile(row, col, tiles = state.selectedLevel.tiles) {
  return tiles[Math.floor(row * state.selectedLevel.width + col)];
}

let lastTime = null;
function gameLoop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }
  const dt = timestamp - lastTime;
  dispatch({ type: "TIMESTEP", ts: dt });

  // update world
  const tiles = state.selectedLevel.tiles.map(tile => ({
    ...tile,
    color: tile.color === state.colorblind ? "white" : tile.color
  }));

  // if the player is on the goal, go to the next level
  let playerTile = getTile(
    getState().player.position.row,
    getState().player.position.col
  );
  if (playerTile.color == "orange") {
    dispatch({ type: "LOAD_LEVEL", level: 1 });
  }
  // update player
  // draw stuff
  ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  drawTiles(tiles);
  drawPlayer(state.player);

  requestAnimationFrame(gameLoop);
  lastTime = timestamp;
}

function loadLevels(): Array<Level> {
  const TILE_ID_MAP = {
    0: "white",
    1: "blue",
    2: "green",
    3: "red",
    4: "gray",
    6: "orange"
  };

  const levelJsons = [
    require("./levels/level1.json"),
    require("./levels/level2.json")
  ];
  const levels: Array<Level> = levelJsons.map(levelJson => {
    const properties = levelJson.properties;
    const rawData = levelJson.layers[0].data;
    const width: number = levelJson.width;
    const height: number = levelJson.height;
    const playerPosition = {
      col: properties.startPositionCol,
      row: properties.startPositionRow
    };
    const tileWidth: number = levelJson.tilewidth;
    const tiles = rawData.map((tileId, index) => {
      const col = index % width;
      const row = Math.floor(index / width);
      const color = TILE_ID_MAP[tileId];
      return { col, row, color };
    });
    return { width, height, tiles, playerPosition, tileWidth };
  });
  return levels;
}

window.onload = init;
