function Ring() {
    this.x = 0;
    this.y = 0;
    this.alpha = 1;
    this.growthMultiplier = 5;
    this.radius = 5;
    this.colour = "hsla(120, 100%, 100%, 1)";
}

Ring.prototype.update = function() {
    this.radius += this.alpha*this.growthMultiplier;
    this.alpha -= 0.03;
    this.colour = "hsla(120, 100%, 100%, " + this.alpha + ")";
}

Ring.prototype.draw = function(c) {
    c.strokeStyle = this.colour;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    c.stroke();
}