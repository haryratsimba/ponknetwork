(function(exports) {
	var Player = function() {
		this.x = 0;
		this.y = 0;
		this.width = 8;
		this.height = 80;
		this.username = '';
		this.score = 0;
		this.color = '#ffffff';
		this.speed = 6;
	};
	Player.prototype.draw = function(ctx){
		ctx.save();
		ctx.fillStyle = this.color;
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.restore();
	};
	//set properties from a litteral object
	Player.prototype.setProp = function(properties){
		for(var p in properties){
			if(this.hasOwnProperty(p))
				this[p] = properties[p];
		}
		return this;
	};
	Player.prototype.update = function(keys) {
		var prevY = this.y; // Previous position
		if (keys.up) {
			this.y -= this.speed;
		}
		if(keys.down) {
			this.y += this.speed;
			console.log('speed : ' + this.speed);
		}
		return (prevY != this.y) ? true : false;
	};
	exports.Player = Player;
})(typeof global === "undefined" ? window : exports);