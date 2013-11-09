(function(exports) {
	var Ball = function() {
		this.x = 10;
		this.y = 10;
		this.width = 10;
		this.height = 10;
		this.color = '#ffffff';
		this.vx = 6.5;
		this.vy = 6.5;
		this.isVisible = true;
	};
	Ball.prototype.draw = function(ctx){
		if(!this.isVisible) return;
		ctx.save();
		ctx.fillStyle = this.color;
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.restore();
	};
	//set properties from a litteral object
	Ball.prototype.setProp = function(properties){
		for(var p in properties){
			if(this.hasOwnProperty(p))
				this[p] = properties[p];
		}
		return this;
	};
	//if ball overlap paddle, modify vx and return true
	Ball.prototype.update = function(limit, medium){
		var cond = rectsOverlap(this.x, this.y, this.width, this.height, 
			limit.x, limit.y, limit.width, limit.height);
		// this.vx = (cond) ? -this.vx : this.vx;
		var left = this.x < medium; //determine the direction of the ball
		if(cond) this.vx = (left) ? Math.abs(this.vx) : -Math.abs(this.vx);
		return cond;
	}
	//code from : http://stackoverflow.com/questions/8017541/javascript-canvas-collision-detection
	var rectsOverlap = function(x0, y0, w0, h0, x2, y2, w2, h2) {
		// if ((x0 > (x2 + w2)) || ((x0 + w0) < x2))
			// return false;
		// if ((y0 > (y2 + h2)) || ((y0 + h0) < y2))
			// return false;
		// return true;
		w2 += x2;
		w0 += x0;
		if (x2 > w0 || x0 > w2) return false;
		h2 += y2;
		h0 += y0;
		if (y2 > h0 || y0 > h2) return false;
		return true;
	};
	exports.Ball = Ball;
})(typeof global === "undefined" ? window : exports);