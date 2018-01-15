let canvas;

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

function init() {
	canvas = document.getElementById('stroop') as HTMLCanvasElement;
	window.addEventListener('resize', resizeCanvas);
	resizeCanvas();
}

window.onload = init;
