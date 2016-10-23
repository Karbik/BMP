var X = 0;
var Y = 1;

var DAMPENING_RATIO = 1000;

var properties = {
	boidCount : 180,
	
	maxScreenWidth: 1920, // bigger screen means that, up to this width, we initially spawn more boids ...
	maxInitialBoidCount: 180, // ...but no more than this...
	minInitialBoidCount: 60, // ...and no less than this
	glowThreshold: 1024, // on screens wider than this, boids will be set to glow by default

	boidMaxVelocity : 15,

	boidRadiusModifier: 1.1, // how much the proximity to fellow boids affects the boid's size
	
	boidMinRadius : 3, 
	friction : 5, 
	flockRadius : 60, // A boid will consider all other boids closer than this to be in its "flock" and act accordingly
	separationStrength : 2, // http://www.red3d.com/cwr/boids/
	alignmentStrength : 6,
	cohesionStrength : 3,
	mouseAttraction : 6, // When a mouse is pressed (or finger tapped), how attracted is the boid going to be towards it.
	
	trailsEnabled: true, 
	speedControlsColour : false, // alterate colouring - going fast = red, going slow = green
	glowyBoids : false,
	speedControlsGlow : false, // If enabled, faster boids will glow more intensely
	boidsHaveArrowhead: false,
	showFPSmeter: true,
	showFullScreen: false,
	
	globalColour : { // the "master" colour, invdividual get slightly different tone
		hue: 20,
		saturation: 100,
		lightness: 50
	},

	sinTicker: 0, // modifiers that smoothly change the saturation 
	cosTicker: 0, // and lightness of globalColour 
	colourTickerSpeed: 0.8, // how quickly the colours should change

	ringSpawnInterval: 250,
	
	edgeMargin: 25 // How far beyond the edge of the screen can a boid go?
};

var boids = [];
var rings = [];
var ringSpawnTimers = [];
var fpsMeter;

$(document).ready(function() {
	var boidCtx = setupBoidCanvas(); // boid canvas is the one getting redrawn every frame, where the body of the boids is drawn
	var trailCtx = setupTrailCanvas(); // trail canvas gets faded out every frame, creating the trails effect

	setupControls();
	setupAboutPanel();
	setupFpsMeter();

	$("body").mousedown(function() {
		startBMP(boidCtx, trailCtx);
	});

	$("body").bind("touchstart", function(){
		startBMP(boidCtx, trailCtx);
	});
});


function startBMP(boidCtx, trailCtx){
	boidCtx.start();
	trailCtx.start();
	$("#splash").fadeOut()
	$("body").unbind("mousedown");
	$("body").unbind("touchstart");
}


function setupControls(){
	var gui = new dat.GUI({
		autoPlace : true
	});
	gui.closed = true;
	gui.width = 400;
	gui.add(properties, "boidCount", 1, 500).name("Boid count").step(1);
	gui.add(properties, "boidMinRadius", 1, 20).name("Minimal radius");
	gui.add(properties, "flockRadius", 1, 300).name("Flock radius");
	gui.add(properties, "friction", 1, 50).name("Friction");
	gui.add(properties, "alignmentStrength", 0, 15).name("Alignment");
	gui.add(properties, "separationStrength", 0, 15).name("Separation");
	gui.add(properties, "cohesionStrength", 0, 15).name("Cohesion");
	gui.add(properties, "mouseAttraction", 0, 15).name("Mouse attraction");
	gui.add(properties, "trailsEnabled").name("Show trails");
	gui.add(properties, "glowyBoids").name("Glowy boids");
	gui.add(properties, "boidsHaveArrowhead").name("Boids have arrowheads");
	gui.add(properties, "speedControlsColour").name("Speed controls colour");
	gui.add(properties, "speedControlsGlow").name("Speed controls glowyness");
	gui.add(properties, "showFPSmeter").name("Show FPS meter");
	gui.add(properties, "showFullScreen").name("Show full screen");
	
	bindFullScreenButton();
}


function setupAboutPanel(){
	$("#about-text").hide();
	$("#about-button").click(function() {
		$("#about-text").slideToggle(100);
	});
	$(".controls-button").click(function(){
		$(this).toggleClass('active');
	})
	$(".close-button").addClass('controls-button');
	$(".close-button").after($("#about-text"));
	$("#about-text").after($("#about-button"));
	$("#about-button").show();
}


function setupBoidCanvas() {
	var ctx = Sketch.create({
		container: document.getElementById("boid-canvas"),
		autostart: false,
		fullscreen: true,
		autoclear: true,
		setup: function(){
			determineInitialBoidCount(this);
			beautySetup(this);
			if(this.width > properties.glowThreshold){
				properties.glowyBoids = true;
			}
		},
		draw: function(){
			for(var i in boids){
				boids[i].draw(this);
			}
			for(var j in rings){
				rings[j].draw(this);
			}
		},
		update: function(){
			properties.squaredFlockRadius = properties.flockRadius * properties.flockRadius;
			for(var i in boids){
				boids[i].update(this);
				if(this.dragging){
					for(var j in this.touches){
						boids[i].attract(this.touches[j]);
					}
				}
			}
			for(var i in rings){
				rings[i].update(this);
				if (rings[i].alpha <= 0) {
					rings.splice(i, 1);
				}
			}
			controlBoidSpawning(ctx);
			controlRingSpawning(ctx);
			determineGlobalColour();

			if(fpsMeter.isPaused){
				if(properties.showFPSmeter){
					fpsMeter.show();
				}
			} else {
				fpsMeter.tick();
				if(!properties.showFPSmeter){
					fpsMeter.hide();
				}
			}			
		}
	})
	return ctx;
}


function setupTrailCanvas(){
	var ctx = Sketch.create({
		container: document.getElementById("trail-canvas"),
		autostart: false,
		fullscreen: true,
		autoclear: false,
		draw: function(){
			if(properties.trailsEnabled){
				for(var i in boids){
					boids[i].drawTrail(this);
				}
			}
			this.fillStyle = "rgba(0,0,0,0.15)";
			this.fillRect(0, 0, this.width, this.height);
		}
	})
	return ctx;
}


function setupFpsMeter(){
	FPSMeter.theme.subtle = {
		heatmaps: [],
		container: {
			color: "#999",
			padding: '2px',
			height: '20px',
			lineHeight: '20px',
			fontSize: "12px",
			textAlign: 'left',
			textShadow: 'none',
			fontFamily: 'monospace'
		},
		count: {
			display: "inline",
			padding: "0px 5px 0px 0px"
		},
		legend: {
			display: "inline"
		}
	}
	fpsMeter = new FPSMeter({
		theme: "subtle",
		position: "fixed",
		left: "0px",
		top: "auto",
		bottom: "0px"
	});
}

/**
 * Changing the colour that all boids share in a smooth manner.
 */
function determineGlobalColour(){
	if (!properties.speedControlsColour) {
		properties.globalColour.hue ++;
		if (properties.globalColour.hue  > 360) {
			properties.globalColour.hue  = 0;
			properties.colourTickerSpeed = Math.random() * 0.5 + 0.5;
		}
		if (properties.sinTicker  > 360) {
			properties.sinTicker = 0;
		}
		if (properties.cosTicker  > 360) {
			properties.cosTicker = 0;
		}

		properties.sinTicker += properties.colourTickerSpeed;
		properties.cosTicker += properties.colourTickerSpeed * 0.7;
		properties.globalColour.saturation = Math.round(85 + (Math.cos(properties.cosTicker * Math.PI / 180) * 15));
		properties.globalColour.lightness = Math.round(65 + (Math.sin(properties.sinTicker * Math.PI / 180) * 25));
	} else {
		properties.globalColour.saturation = 100;
		properties.globalColour.lightness = 60;
	}
}
/**
 * Controlling the population count of rings that spawn when you hold down mouse
 */
function controlRingSpawning(ctx){
	if (ctx.dragging) {
		for(i in ctx.touches){
			var spawnRing = function(){
				if(!ctx.dragging){ 
					return; 
				}
				var r = new Ring();
				r.radius = 5;
				r.x = ctx.touches[i].x;
				r.y = ctx.touches[i].y;
				rings.push(r);
			}
		
			if (ringSpawnTimers.length < ctx.touches.length) {
				spawnRing();
				ringSpawnTimers.push(
					window.setInterval(function() {
						spawnRing();
					}, properties.ringSpawnInterval)
				);
			}
		}	
	} else {
		for(i in ringSpawnTimers){
			window.clearInterval(ringSpawnTimers[i]);	
			ringSpawnTimers.pop();
		}
	}
}


/**
 * Controlling the population count of boids
 */
function controlBoidSpawning(ctx){
	var difference = properties.boidCount - boids.length;
	if (difference > 0) {
		spawnBoid(ctx);
	} else if (difference < 0) {
		var i = 0;
		while(i > difference){
			boids.pop();
			i--;
		}
	}
}


/**
 * Spawn a boid at random location on canvas
 */
function spawnBoid(ctx) {
	b = new Boid();
	b.x = b.prevx = Math.random() * ctx.width;
	b.y = b.prevy = Math.random() * ctx.height;
	b.vel[X] = (0.5 - Math.random())*properties.boidMaxVelocity;
	b.vel[Y] = (0.5 - Math.random())*properties.boidMaxVelocity;
	b.radius = properties.boidMinRadius;
	boids.push(b);

	var r = new Ring();
	r.radius = 1;
	r.growthMultiplier = 2;
	r.x = b.x;
	r.y = b.y;
	rings.push(r);
}

/**
 * Returns a HSLA string, with given hue & alpha & the global saturation/brightness
 */
function getHSLA(hue, alpha){
	return "hsla(" + hue + "," + properties.globalColour.saturation + "%," + properties.globalColour.lightness+"%, " + alpha + ")";
}

/**
 * Initially we arrange boids fancily in a multilayered circle, facing out from the centre.
 */
function beautySetup(ctx){
	var focusPoint = [ctx.width/2, ctx.height/2];
	var focusRadius = 300;
	var startingAngle = 0;
	var endAngle = 2*Math.PI;
	var angleStep = Math.PI/16;
	var startingDistance = Math.min(ctx.height/2 - ctx.height/3, ctx.width/2 - ctx.width/3);
	var distanceStep = 20;
	var initialVelocity = 7;

	var angle = startingAngle;
	var level = 0;
	var distance = startingDistance;

	for(var i = 0; i < properties.boidCount; i++){
		b = new Boid();
		b.x = b.prevx = focusPoint[X] + distance * Math.cos(angle);
		b.y = b.prevy = focusPoint[Y] + distance * Math.sin(angle);

		var focusNormal = [-(focusPoint[Y] - b.y), focusPoint[X] - b.x];
		var distanceDifference = focusRadius / Math.sqrt(focusNormal[X] * focusNormal[X] + focusNormal[Y] * focusNormal[Y]);
		focusNormal[X] *= distanceDifference;
		focusNormal[Y] *= distanceDifference;
		var targetPoint = [focusPoint[X] + focusNormal[X], focusPoint[Y] + focusNormal[Y]];

		b.vel[X] = (b.x - targetPoint[X])/ initialVelocity
		b.vel[Y] = (b.y - targetPoint[Y])/ initialVelocity
		b.radius = properties.boidMinRadius;
		boids.push(b);

		angle += angleStep;
		if(angle > endAngle){
			level ++;
			angle = startingAngle + angleStep/(level % 2 == 0 ? 2 : 1 );
			distance -= distanceStep;
			distanceStep *= 0.85
		}
	}
}

function determineInitialBoidCount(ctx){
	var ratio = ctx.width / properties.maxScreenWidth ;
	if(ratio > 1){ 
		ratio = 1;
	}
	properties.boidCount = Math.round(properties.maxInitialBoidCount * ratio);
	if(properties.boidCount < properties.minInitialBoidCount){
		properties.boidCount = properties.minInitialBoidCount;
	}
}

function bindFullScreenButton(){
	$(".cr.boolean:last-child input").click( function(e){
		if(!isFullScreenActive()){
			enterFullScreen();
		}
		e.preventDefault();
	})
}

function isFullScreenActive(){
	var e = document.fullScreenElement || document.mozFullScreenElement || document.webkitFullScreenElement || document.msFullScreenElement;
	return e ? true : false;
}

function enterFullScreen(){
	var e = document.getElementById("wrapper");
	var fullScreenCapability = e.requestFullScreen ||  e.mozRequestFullScreen ||  e.webkitRequestFullScreen ||  e.msRequestFullScreen;
	if(fullScreenCapability){
		fullScreenCapability.call(e);
	}
}

function exitFullScreen(){
	var exitCall = document.exitFullScreen || document.mozExitFullScreen || document.webkitExitFullScreen || document.msExitFullScreen;
	exitCall.call();
}
