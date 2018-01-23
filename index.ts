import * as Mousetrap from 'mousetrap';
import * as _ from 'lodash';

type Player = { position: Position; width; height; color };
type Tile = { col: number; row: number; color: string };
type Position = { row: number; col: number };
type Level = {
	tiles: Array<Tile>;
	height: number;
	width: number;
	playerPosition: { row: number; col: number };
};

let canvas;
let ctx;
let level;
const SCREEN_HEIGHT = 703; // TODO fix this
const SCREEN_WIDTH = 1280;
const BLOCK_SIZE = 32;

function l(...args) {
	console.log(...args);
}

function resizeCanvas() {
	canvas.width = SCREEN_WIDTH;
	canvas.height = SCREEN_HEIGHT;
}

function init() {
	canvas = document.getElementById('stroop') as HTMLCanvasElement;
	ctx = canvas.getContext('2d');
	resizeCanvas();
	level = loadLevel();
	player.position = level.playerPosition;
	requestAnimationFrame(gameLoop);
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

function drawPlayer(player: Player) {
	drawRect(
		player.position.col * BLOCK_SIZE,
		player.position.row * BLOCK_SIZE,
		player.width,
		player.height,
		player.color
	);
}

let player = { position: { row: 0, col: 0 }, width: 32, height: 64, color: 'black', vx: 0 };
let PLAYER_SPEED = 15;

function canMove(tile: Tile) {
	return tile.color === 'white' ? true : false;
}

function getTile(row, col, tiles = level.tiles) {
	return tiles[Math.floor(row * level.width + col)];
}

const pressedKeys = new Set();
Mousetrap.bind('right', () => pressedKeys.add('right'), 'keydown');
Mousetrap.bind('right', () => pressedKeys.delete('right'), 'keyup');
Mousetrap.bind('left', () => pressedKeys.add('left'), 'keydown');
Mousetrap.bind('left', () => pressedKeys.delete('left'), 'keyup');

let colorblind: boolean | string = false;
Mousetrap.bind('1', () => (colorblind = colorblind !== 'red' && 'red'));
Mousetrap.bind('2', () => (colorblind = colorblind !== 'green' && 'green'));
Mousetrap.bind('3', () => (colorblind = colorblind !== 'blue' && 'blue'));

window.onload = init;

let lastTime = null;
function gameLoop(timestamp) {
	if (!lastTime) {
		lastTime = timestamp;
		requestAnimationFrame(gameLoop);
		return;
	}
	const dt = timestamp - lastTime;
	// update world
	const tiles = level.tiles.map(tile => ({
		...tile,
		color: tile.color === colorblind ? 'white' : tile.color,
	}));

	// update player
	if (pressedKeys.has('right') && !pressedKeys.has('left')) {
		player.vx = 1;
	} else if (pressedKeys.has('left') && !pressedKeys.has('right')) {
		player.vx = -1;
	} else {
		player.vx = 0;
	}

	if (
		player.vx === 1 &&
		canMove(getTile(player.position.row, Math.floor(player.position.col + player.vx), tiles))
	) {
		player.position.col += dt / 1000 * player.vx * PLAYER_SPEED;
	}

	if (
		player.vx === -1 &&
		canMove(getTile(player.position.row, Math.ceil(player.position.col + player.vx), tiles))
	) {
		player.position.col += dt / 1000 * player.vx * PLAYER_SPEED;
	}

	if (!canMove(getTile(player.position.row, Math.ceil(player.position.col), tiles))) {
		player.position.col = Math.floor(player.position.col);
	}
	if (!canMove(getTile(player.position.row, Math.floor(player.position.col), tiles))) {
		player.position.col = Math.ceil(player.position.col);
	}

	// draw stuff
	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	drawTiles(tiles);
	drawPlayer(player);

	requestAnimationFrame(gameLoop);
	lastTime = timestamp;
}

const TILE_ID_MAP = {
	0: 'white',
	1: 'blue',
	2: 'green',
	3: 'red',
	4: 'gray',
	5: 'white', // player renders separately. dont worry, he is black
	6: 'orange',
};

function loadLevel(): Level {
	const levelJson = require('./level1.json');
	const properties = levelJson.properties;
	const rawData = levelJson.layers[0].data;
	const width: number = levelJson.width;
	const height: number = levelJson.height;
	const playerPosition = {
		col: properties.startPositionCol,
		row: properties.startPositionRow,
	};

	const tiles = rawData.map((tileId, index) => {
		const col = index % width;
		const row = Math.floor(index / width);
		const color = TILE_ID_MAP[tileId];

		return { col, row, color };
	});

	return { width, height, tiles, playerPosition };
}
