import * as Mousetrap from 'mousetrap';
import * as _ from 'lodash';

/* ***** */
/* types */
/* ***** */
type Player = { position: Position; width; height; color; vx };
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
	pressedKeys: Set<string>;
	colorblind: 'red' | 'green' | 'blue' | null;
};
type LoadLevelAction = {
	type: 'LOAD_LEVEL';
	level: number;
};
type TimestepAction = {
	type: 'TIMESTEP';
	ts: number;
};
type KeyboardAction = {
	type: 'KEYBOARD';
	key: 'left' | 'right' | 'up' | 'down' | '1' | '2' | '3';
	direction: 'up' | 'down';
};
type Action = LoadLevelAction | TimestepAction | KeyboardAction;

/* ********* */
/* constants */
/* ********* */
const LEVELS = loadLevels();
const BLOCK_SIZE = LEVELS[0].tileWidth;
const SCREEN_HEIGHT = LEVELS[0].width * BLOCK_SIZE; // TODO fix this
const SCREEN_WIDTH = LEVELS[0].height * BLOCK_SIZE;
const initialState: State = {
	player: { position: { row: 0, col: 0 }, width: 32, height: 64, color: 'black', vx: 0 },
	selectedLevel: null,
	pressedKeys: new Set(),
	colorblind: null,
};

let state: State = initialState;

/* ******* */
/* helpers */
/* ******* */

function createCanvas({ height, width }) {
	const canvas = document.createElement('canvas');
	canvas.height = height;
	canvas.width = width;
	canvas.setAttribute('style', 'border: 1px solid black');
	return canvas;
}

function dispatch(action) {
	state = reducer(state, action);
}
function reducer(state: State = initialState, action: Action): State {
	return {
		...state,
		selectedLevel: selectedLevelReducer(state, action),
		player: playerReducer(state, action),
		colorblind: colorblindReducer(state, action),
		pressedKeys: pressedKeysReducer(state, action),
	};
}

function selectedLevelReducer(state, action) {
	if (action.type === 'LOAD_LEVEL') {
		state.selectedLevel = LEVELS[action.level];
	}
	return state.selectedLevel;
}
function playerReducer(state, action) {
	const { player, pressedKeys } = state;

	if (action.type === 'LOAD_LEVEL') {
		console.error(LEVELS, action.level);
		player.position = LEVELS[action.level].playerPosition;
	} else if (action.type === 'TIMESTEP') {
		const dt = action.ts;

		if (pressedKeys.has('right') && !pressedKeys.has('left')) {
			player.vx = 1;
		} else if (pressedKeys.has('left') && !pressedKeys.has('right')) {
			player.vx = -1;
		} else {
			player.vx = 0;
		}

		if (
			player.vx === 1 &&
			canMove(getTile(player.position.row, Math.floor(player.position.col + player.vx)))
		) {
			player.position.col += dt / 1000 * player.vx * PLAYER_SPEED;
		}

		if (
			player.vx === -1 &&
			canMove(getTile(player.position.row, Math.ceil(player.position.col + player.vx)))
		) {
			player.position.col += dt / 1000 * player.vx * PLAYER_SPEED;
		}

		if (!canMove(getTile(player.position.row, Math.ceil(player.position.col)))) {
			player.position.col = Math.floor(player.position.col);
		}
		if (!canMove(getTile(player.position.row, Math.floor(player.position.col)))) {
			player.position.col = Math.ceil(player.position.col);
		}
	}
	return player;
}

function pressedKeysReducer(state, action) {
	if (action.type !== 'KEYBOARD') {
		return state.pressedKeys;
	}

	if (action.direction === 'down') {
		state.pressedKeys.add(action.key);
	} else if (action.direction === 'up') {
		state.pressedKeys.delete(action.key);
	}
	return state.pressedKeys;
}

const keyToColor = { '1': 'red', '2': 'green', '3': 'blue' };
function colorblindReducer(state, action) {
	if (action.type === 'KEYBOARD' && action.key in keyToColor) {
		const color = keyToColor[action.key];
		return color === state.colorblind ? null : color;
	}
	return state.colorblind;
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
		drawRect(tile.col * BLOCK_SIZE, tile.row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, tile.color);
	}
}

const canvas = createCanvas({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
const ctx = canvas.getContext('2d');

function init() {
	// init keyboard bindings
	function createKeyboardAction(key, direction): KeyboardAction {
		return { type: 'KEYBOARD', key, direction };
	}
	['right', 'left', 'up', 'down'].forEach(key => {
		Mousetrap.bind(key, () => dispatch(createKeyboardAction(key, 'down')), 'keydown');
		Mousetrap.bind(key, () => dispatch(createKeyboardAction(key, 'up')), 'keyup');
	});
	Mousetrap.bind('1', () => dispatch(createKeyboardAction('1', 'down')));
	Mousetrap.bind('2', () => dispatch(createKeyboardAction('2', 'down')));
	Mousetrap.bind('3', () => dispatch(createKeyboardAction('3', 'down')));

	dispatch({ type: 'LOAD_LEVEL', level: 0 });
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

let PLAYER_SPEED = 15;

function canMove(tile: Tile) {
	return tile.color === 'white' || tile.color == state.colorblind;
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
	dispatch({ type: 'TIMESTEP', ts: dt });

	// update world
	const tiles = state.selectedLevel.tiles.map(tile => ({
		...tile,
		color: tile.color === state.colorblind ? 'white' : tile.color,
	}));

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
		0: 'white',
		1: 'blue',
		2: 'green',
		3: 'red',
		4: 'gray',
		6: 'orange',
	};

	const levelJsons = [require('./levels/level1.json')];
	const levels: Array<Level> = levelJsons.map(levelJson => {
		const properties = levelJson.properties;
		const rawData = levelJson.layers[0].data;
		const width: number = levelJson.width;
		const height: number = levelJson.height;
		const playerPosition = {
			col: properties.startPositionCol,
			row: properties.startPositionRow,
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
