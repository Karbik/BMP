function Boid() {
	this.x = 0;
	this.y = 0;

	this.prevx = 0;
	this.prevy = 0;
	
	this.speed = 0;
	this.vel = [0,0];
	this.acc = [0,0];

	this.cohesion = [0,0];
	this.separation = [0,0];
	this.alignment = [0,0];
	
	this.radius = 0;
	this.colour = "hsla(120, 100%, 100%, 1)";

	this.hue = 120;

	this.neighbours = 0;
	this.centreOfMass = [0,0];
}


/**
 * Boid movement logic
 */
Boid.prototype.update = function(ctx) {
	this.radius = properties.boidMinRadius;
	this.prevx = this.x;
	this.prevy = this.y;
	this.acc[X] = this.cohesion[X] = this.alignment[X] = this.separation[X] = 0;
	this.acc[Y] = this.cohesion[Y] = this.alignment[Y] = this.separation[Y] = 0;
	this.neighbours = 0;
	this.centreOfMass[X] = 0;
	this.centreOfMass[Y] = 0;

	this.movement();
	this.wraparound(ctx);

	this.x += this.vel[X];
	this.y += this.vel[Y];

	this.determineColour();
}


Boid.prototype.attract = function(attractor){
	this.vel[X] += (attractor.x - this.x) * properties.mouseAttraction/10000;
	this.vel[Y] += (attractor.y - this.y) * properties.mouseAttraction/10000;
}

Boid.prototype.determineColour = function(){
	if (properties.speedControlsColour) {
		this.hue = 120 - Math.round((10 * this.speed > 120) ? 120 : (10 * this.speed));
	} else {
		this.hue = properties.globalColour.hue + this.speed;
	}
	this.colour = getHSLA(this.hue, 1);
}


Boid.prototype.movement = function(){
	var b;
	var distanceSquared;


	for(i in boids){
		b = boids[i];
		if(b == this){
			continue;
		}

		distanceSquared = (b.x - this.x) * (b.x - this.x) + (b.y - this.y) * (b.y - this.y);
		if(distanceSquared < properties.squaredFlockRadius){
			/**
			 * Separation - steer to avoid crowding local flockmates
			 */
			if(distanceSquared < (properties.squaredFlockRadius - properties.squaredFlockRadius/6)){
				this.separation[X] += (this.x - b.x ) * (properties.separationStrength / DAMPENING_RATIO);
				this.separation[Y] += (this.y - b.y ) * (properties.separationStrength / DAMPENING_RATIO);
			}

			/**
			 * Alignment -  steer towards the average heading of local flockmates
			 */
			this.alignment[X] += (b.vel[X] - this.vel[X]) * (properties.alignmentStrength / DAMPENING_RATIO);
			this.alignment[Y] += (b.vel[Y] - this.vel[Y]) * (properties.alignmentStrength / DAMPENING_RATIO);
			/**
			 * Cohestion - steer to move toward the average position (center of mass) of local flockmates
			 */
			this.centreOfMass[X] += b.x;
			this.centreOfMass[Y] += b.y

			this.neighbours ++;
		}
		
	}
	
	if (this.neighbours > 0) {
		this.centreOfMass[X] = this.centreOfMass[X] / this.neighbours;
		this.centreOfMass[Y] = this.centreOfMass[Y] / this.neighbours;
		this.cohesion[X] = (this.centreOfMass[X] - this.x) * (properties.cohesionStrength / DAMPENING_RATIO);
		this.cohesion[Y] = (this.centreOfMass[Y] - this.y) * (properties.cohesionStrength / DAMPENING_RATIO);
		this.radius = properties.boidMinRadius + Math.log2(this.neighbours) + 0.01;
		
		this.acc[X] = this.separation[X] + this.alignment[X] + this.cohesion[X];
		this.acc[Y] = this.separation[Y] + this.alignment[Y] + this.cohesion[Y];

		this.vel[X] += this.acc[X];
		this.vel[Y] += this.acc[Y];
	}

	

	this.speed = Math.sqrt(this.vel[X] * this.vel[X] + this.vel[Y] * this.vel[Y]);
	if(this.speed > properties.boidMaxVelocity){
		var ratio = properties.boidMaxVelocity/this.speed;
		this.vel[X] = this.vel[X] * ratio;
		this.vel[Y] = this.vel[Y] * ratio;
	}

	// friction
	this.vel[X] *= 1 - (properties.friction) / DAMPENING_RATIO;
	this.vel[Y] *= 1 - (properties.friction) / DAMPENING_RATIO;
}


/**
 * Ensures boids get wrapped around to the other side once they're beyond screen boundaries
 */
Boid.prototype.wraparound = function(ctx){
	if(this.x > ctx.width+properties.edgeMargin){
		this.x = -properties.edgeMargin
		this.prevx = this.x;
		this.prevy = this.y;
	}
	if(this.x < -properties.edgeMargin){
		this.x = ctx.width+properties.edgeMargin
		this.prevx = this.x;
		this.prevy = this.y;
	}
	if(this.y > ctx.height+properties.edgeMargin){
		this.y = -properties.edgeMargin
		this.prevx = this.x;
		this.prevy = this.y;
	}
	if(this.y < -properties.edgeMargin){
		this.y = ctx.height + properties.edgeMargin
		this.prevx = this.x;
		this.prevy = this.y;
	}
}


Boid.prototype.draw = function(c) {
	if (properties.glowyBoids) {
		var glowRadius = properties.speedControlsGlow ? (this.radius + this.speed * 3) : this.radius * 3;
		glowRadius = glowRadius < 4 ? 4 : glowRadius; // Ensuring that even tiny boids have a visible glow
		
		var g = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRadius);
		g.addColorStop(0, getHSLA(this.hue, 1));
		g.addColorStop(0.2, getHSLA(this.hue, 0.3));
		g.addColorStop(1, getHSLA(this.hue, 0));

		c.fillStyle = g;
		c.beginPath();
		c.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
		c.fill()
	}

	c.fillStyle = this.colour;
	c.beginPath();

	if(properties.boidsHaveArrowhead){
		var headSize = this.radius*2;
		var alpha = Math.atan2(-this.vel[Y], -this.vel[X]);
		var beta = alpha + Math.PI / 6;
		var gamma =  alpha - Math.PI / 6;
		var aX = headSize * Math.cos(alpha);
		var aY = headSize * Math.sin(alpha);
		var bX = headSize * Math.cos(beta);
		var bY = headSize * Math.sin(beta);
		var cX = headSize * Math.cos(gamma);
		var cY = headSize * Math.sin(gamma);
		c.moveTo(this.x - aX, this.y - aY);
		c.lineTo(this.x + bX, this.y + bY);
		c.lineTo(this.x + cX, this.y + cY);
		c.lineTo(this.x - aX, this.y - aY);
	} else {
		c.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2);
	}

	c.fill();
}

Boid.prototype.drawTrail = function(c) {
	c.lineWidth = this.radius;
	c.lineCap = "round";
	c.strokeStyle = this.colour;
	c.beginPath();
	c.moveTo(this.prevx, this.prevy);
	c.lineTo(this.x, this.y);
	c.stroke();
}


