(function(exports) {
	var Keys = function(up, down) {
		this.up = up || false;
		this.down = down || false;
		this.restart = down || false;
		this.handleKey = function(e, value){
			var c = e.keyCode;
			switch (c) {
				// case 38: // Up
				case 83: // Up (S)
					this.up = value;
					break;
				// case 40: // Down
				case 88: // Down (X)
					this.down = value;
					break;
				case 32: // space key
					this.restart = value;
					break;
			};
		};
	};
	Keys.prototype.onKeyDown = function(e) {
		this.handleKey(e, true);
	};
	Keys.prototype.onKeyUp = function(e) {
		this.handleKey(e, false);
	};
	exports.Keys = Keys;
})(typeof global === "undefined" ? window : exports);
