import * as Mousetrap from 'mousetrap';
import * as _ from 'lodash';

let canvas;
let ctx;
const SCREEN_HEIGHT = 720;
const SCREEN_WIDTH = 1080;
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
	requestAnimationFrame(gameLoop);
}

function drawRect({ x, y, w, h, color }) {
	ctx.fillStyle = color;
	ctx.fillRect(x, y, w, h);
}

function drawBar({ x, color }) {
	let y = SCREEN_HEIGHT - 400;
	drawRect({ x, color, y, w: 20, h: 400 });
}

function drawPlayer(player: Player) {
	let y = SCREEN_HEIGHT - player.height;
	drawRect({
		x: player.x,
		y: y,
		w: player.width,
		h: player.height,
		color: player.color,
	});
}

type Player = { x; y; width; height; color };

let player = { x: 0, y: 0, width: 32, height: 64, color: 'black', vx: 0 };
let PLAYER_SPEED = BLOCK_SIZE * 15;

const pressedKeys = new Set();
Mousetrap.bind('right', () => pressedKeys.add('right'), 'keydown');
Mousetrap.bind('right', () => pressedKeys.delete('right'), 'keyup');
Mousetrap.bind('left', () => pressedKeys.add('left'), 'keydown');
Mousetrap.bind('left', () => pressedKeys.delete('left'), 'keyup');

window.onload = init;

let lastTime = null;
function gameLoop(timestamp) {
	if (!lastTime) {
		lastTime = timestamp;
		requestAnimationFrame(gameLoop);
		return;
	}
	const dt = timestamp - lastTime;
	// update player
	if (pressedKeys.has('right') && !pressedKeys.has('left')) {
		player.vx = 1;
	} else if (pressedKeys.has('left') && !pressedKeys.has('right')) {
		player.vx = -1;
	} else {
		player.vx = 0;
	}
	player.x += dt / 1000 * player.vx * PLAYER_SPEED;

	// draw stuff
	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	drawBar({
		x: 100,
		color: 'red',
	});
	drawBar({
		x: 140,
		color: 'green',
	});
	drawBar({
		x: 180,
		color: 'blue',
	});
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

type Tile = {
	col: number;
	row: number;
	color: string;
};

type Level = {
	tiles: Array<Tile>;
	height: number;
	width: number;
	playerPosition: { row: number; col: number };
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

	return {
		width,
		height,
		tiles,
		playerPosition,
	};
}

console.error(loadLevel());
