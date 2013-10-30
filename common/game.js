var canvas,
	ctx,
	socket,
	run = true,
	players = {local_player: null, opponent: null},
	ball,
	WIDTH = 780, //default values
	HEIGHT = 480,
	keys,
	fontStyle = {fillStyle: '#ffffff', textBaseline: 'middle',
		textAlign: 'center'},
	winnerName;

function init(){
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	WIDTH = canvas.width;
	HEIGHT = canvas.height;
	socket = io.connect('http://nodejs-ponknetwork.rhcloud.com:8000/');
	ball = new Ball();
	keys = new Keys();
	setEventHandlers();
}

function animate(){
	var cond = !run, cond1 = !isGameCanRun();
	if(cond || cond1){
		if(cond){
			scoreBoard();
		}
		if(cond1){ //check if there are two players, a player may disconnect when viewing results
			reset('Waiting for an other player...');
		}
	} else{
		//console.log('draw');
		update();
		draw();
	}
	window.requestAnimFrame(animate);
}

function update(){
	var current = players.local_player, 
		opponent = players.opponent;
	//Update local player and check for change
	if(current.update(keys)) {
		// Send local player position to the server
		socket.emit("moveplayer", {x: current.x, y: current.y});
	}
	ball.x+=ball.vx; //update ball pos
	ball.y+=ball.vy;
	//check collisions with top or bottom canvas
	if(ball.y <= 0 || ball.y+ball.height >= HEIGHT){
		ball.vy = -ball.vy;
	}
	var isOverlapping = ball.update(current) || ball.update(opponent);
	if(isOverlapping){
		ball.isVisible = false;
		socket.emit("ballrebond", {x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy});
	}
	var cond = (current.x > 0) ? ball.x+ball.width >= WIDTH : ball.x <= 0; //determine what side is the player wall
	if(cond) { //if ball hit the current player wall
		// current.score+=1;
		socket.emit("clienthit"); //send message to server to tell opponent that we get points
		/* if(current.score >= 10) { //if local_player get 10 points
			socket.emit("playerwin", current.username);
		} */
	}
}

function draw(){
	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	drawBackground();
	drawFilet();
	displayPlayersName();
	// displayScores();
	//draw players
	var p_y = players.local_player.y;
	var p_h = players.local_player.height;
	if(p_y <= 0) {
		players.local_player.y = 0;
	} else if(p_y + p_h >= HEIGHT){
		players.local_player.y = HEIGHT - p_h;
	}
	if(!isGameCanRun()) return;
	players.local_player.draw(ctx);
	players.opponent.draw(ctx);
	ball.draw(ctx);
}

function drawBackground(){
	ctx.save();
	ctx.fillStyle = '#000000';
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	ctx.restore();
}

function drawFilet(){
	var j = 0, square_size = HEIGHT/100;
	for(var x = 0 ; x < HEIGHT ; x+= square_size){
		ctx.save();
		ctx.fillStyle = (j++ % 2 == 0) ? '#ffffff' : '#000000';
		ctx.fillRect(WIDTH/2 - square_size/2, x, square_size, square_size);
		ctx.restore();
	}
}

function displayScores(){
	for(var p in players){
		var player = players[p];
		var x_pos = (player.x > 0) ? WIDTH*(3/4) : WIDTH*(1/4);
		fontStyle.font = "normal bold 40px 'VT323'";
		displayText(player.score, x_pos, 28, fontStyle);
	}
}

function displayPlayersName(){
	for(var p in players){
		var player = players[p];
		var x_pos = (player.x > 0) ? WIDTH*(3/4) : WIDTH*(1/4);
		fontStyle.font = "normal bold 40px 'VT323'";
		displayText(player.username, x_pos, 28, fontStyle);
	}
}

function reset(message){
	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	drawBackground();
	initPlayers();
	fontStyle.font = "normal bold 32px 'VT323'";
	displayText(message, WIDTH/2, HEIGHT*(1/3), fontStyle);
}

/**
 * param : player who won the game
 */
function scoreBoard(){
	reset(winnerName + ' wins!');
	fontStyle.font = "normal bold 31px 'VT323'";
	displayText('Press "space" key to replay', WIDTH/2, HEIGHT*(3/4), fontStyle);
	if(keys.restart){
		socket.emit('restart');
	}
}

/**
 * Display text on canvas
 * properties : obj containing context text properties like textBaseline, font...
 */
function displayText(text, x, y, properties){
	ctx.save();
	for(var p in properties){
		ctx[p] = properties[p];
	}
	ctx.fillText(text, x, y);
	ctx.restore();
}

/**
 * Init players score and vertically center players
 */
function initPlayers(){
	for(var p in players){
		if(typeof players[p] !== 'undefined' && players[p] != null){
			players[p].score = 0;
			players[p].y = HEIGHT/2 - players[p].height/2; //center player vertically, player keep his horizontal position
			players[p].x = (players[p].x > 0) ? WIDTH - players[p].width : 0; //set horizontal position accroding to player x and canvas
		}
	}
}

function initBallPos(){
	if(typeof ball === 'undefined' || ball == null) return;
	ball.x = WIDTH/2 - ball.width/2;
	ball.y = HEIGHT/2 - ball.height/2;
}

/**
 * param : {local_player: player, opponent: opponent}
 */
function setPlayers(players_profiles){
	var prop = ['local_player', 'opponent'];
	var obj = [players_profiles.local_player, players_profiles.opponent];
	for(var i = 0 ; i < 2 ; i++){
		var cond = typeof obj[i] !== 'undefined' && obj[i] != null;
		players[prop[i]] = (cond) ? new Player() : null;
		if(!cond) continue;
		players[prop[i]].setProp(obj[i]);
	}
	players.local_player.color = '#4dd386'; //set an other color for local player
	initPlayers(); //setPlayers position
	run = true;
}

function setBall(ballPos){
	ball = new Ball();
	ball.setProp(ballPos);
	initBallPos();
}

function setOpponent(opponent){
	players.opponent = new Player();
	players.opponent.setProp(opponent);
	initPlayers();
	run = true;
}

function removeOpponent(){
	players.opponent = null;
}

function moveOpponent(position){
	players.opponent.setProp(position)
}

// Keyboard key down
function onKeydown(e) {
	if(players.local_player) {
		keys.onKeyDown(e);
	}
}

// Keyboard key up
function onKeyup(e) {
	if(players.local_player) {
		keys.onKeyUp(e);
	}
}

/**
 * game can run if there are two players
 */
function isGameCanRun(){
	for(var p in players){
		if(typeof players[p] === 'undefined' || 
			players[p] == null) return false;
	}
	return true;
}

function setEventHandlers() {
	window.addEventListener("keydown", onKeydown, false);
	window.addEventListener("keyup", onKeyup, false);
	
	socket.on('connect', function(){
		//send username and canvas width, to set player
		socket.emit('adduser', prompt("What's your name?"), WIDTH, HEIGHT);
	});

	socket.on('updatechat', function (username, data) {
		$('#conversation').append('<b>'+username + ':</b> ' + data + '<br>');
	});

	/* param rooms looks like that
	 * [{room_name: 'room_name', players: [username, ...]}]
	 */
	socket.on('updaterooms', function(rooms, current_room) {
		console.log('available rooms : ' + JSON.stringify(rooms));
		var template = $('#model_room').html();
		$('#rooms').empty().append(Mustache.render(template, {rooms_obj: rooms}));
	});

	socket.on('newplayers', function(players, room){
		$('#conversation')
			.empty()
			.append('Welcome <b>' + players.local_player.username + '</b>, you have connected on <b>' + room + '</b><br/>');
		console.log('receive player config : ' + JSON.stringify(players.local_player));
		console.log('players list : ' + JSON.stringify(players));
		setPlayers(players);
	});

	socket.on('newopponent', function (opponent) {
	$('#conversation').append('<b>' + opponent.username + '</b> has connected.<br/>');
		console.log('your opponent is : ' + JSON.stringify(opponent));
		setOpponent(opponent);
	});
	
	socket.on('removeopponent', function () {
		console.log('removeOpponent');
		removeOpponent();
	});
	
	socket.on('moveplayer', function (position) {
		moveOpponent(position);
	});
	
	socket.on('ballposition', function(ballPos){
		setBall(ballPos);
	});
	
	socket.on('ballrebond', function(velocity){
		ball.setProp(velocity);
		ball.isVisible = true;
	});
	
	socket.on('increaseoppscore', function(){
		players.opponent.score+=1;
	});
	
	socket.on('playerwin', function(winner){
		run = false; //stop the game
		winnerName = winner; //set winner name
	});
	
	socket.on('restart', function(){
		run = true; //restart the game
	});
	
	socket.on('opponentleave', function(){
		players.opponent = null;
	});
	
	socket.on('incurrentroom', function(){
		$('#conversation').append('<b>You are actually inside this room</b><br/>');
	});
	
	socket.on('roomfull', function(){
		$('#conversation').append('<b>This room is full</b><br/>');
	});
};

function switchRoom(room, width){
	socket.emit('switchRoom', room, width);
}