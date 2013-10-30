// We need to use the express framework: have a real web servler that knows how to send mime types etc.
var express=require('express');

// Init globals variables for each module required
var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);
  
var Player = new require('./common/player.js').Player;
server.listen(process.env.OPENSHIFT_NODEJS_PORT || 8080,
           process.env.OPENSHIFT_NODEJS_IP);

// routing with express, mapping for default page
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/client/index.html');
});

app.use(express.static(__dirname + '/')); //routing '/' url with server directory to allows access of files

var room_index = 4; //next room index
// rooms which are currently available in chat
var rooms = ['room1','room2','room3'];
io.sockets.on('connection', function (socket) {
	
	/*
	 * 1) FIRST CONNECTED PLAYER IS PLACED ON THE LEFT, AND SECOND CONNECTED PLAYER, ON THE RIGHT
	 * 	2) IF SOMEONE DISCONNECT AND THERE IS A PLAYER IN THE ROOM, NEW PLAYER WILL BE ADDED ACCORDING TO THIS PLAYER
	 * 	PLAYER1 (first connected)	|	PLAYER2 (second connected)
	 * 	http://stackoverflow.com/questions/8788790/list-of-connected-clients-username-using-socket-io
	 */
	socket.on('adduser', function(username, client_width, client_height){
		var player = new Player();
		var player_x_pos = 0, room_name, opponent = null;
		for(var i = 0 ; i < rooms.length ; i++){
			var room = rooms[i];
			var p_in_room = io.sockets.clients(room);
			if(p_in_room.length >= 2) { //if room is full add new room
				if(i < rooms.length - 1) continue; //look for an other room
				if(i >= rooms.length - 1){ //last room full, add new room
					rooms.push(((room_name) = 'room' + (room_index++))); //push new room and set room name
					player_x_pos = 0; //client is the first, so first player is placed on the left
				}
			} else{ //check if there is a client in the current room, if there is, player is placed according to the other player
				room_name = room;
				if(p_in_room.length == 1){
					opponent = p_in_room[0].player;
					player_x_pos = (opponent.x == 0) ? client_width - player.width : 0; //modify it later
				} else{ //first player is always on the left
					player_x_pos = 0;
				}
				break;
			}
		}
		socket.join((socket.room = (room_name)));
		username = (username == null) ? 'anonymous' : username;
		socket.player = player.setProp({x: player_x_pos, y: 10, username: username});
		connexionMessages(socket, opponent);
	});
	
	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.player.username, data);
	});
	
	socket.on('moveplayer', function(position){
		socket.broadcast.to(socket.room).emit('moveplayer', position);
	});
	
	socket.on('ballrebond', function(velocity){
		// socket.broadcast.to(socket.room).emit('ballrebond', velocity);
		io.sockets.in(socket.room).emit('ballrebond', velocity);
	});
	
	socket.on('clienthit', function(){
		io.sockets.in(socket.room).emit('ballposition', generateBallPos()); //send ballPosition to all players in the room
		// socket.broadcast.to(socket.room).emit('increaseoppscore');
	});
	
	socket.on('repositionball', function(){
		io.sockets.in(socket.room).emit('ballposition', generateBallPos());
	});
	
	socket.on('playerwin', function(winner){
		io.sockets.in(socket.room).emit('playerwin', winner); //send winner name to all clients  in the room
	});
	
	socket.on('restart', function(){
		io.sockets.in(socket.room).emit('restart'); //tell to all user the game restart
	});
	
	socket.on('switchRoom', function(newroom, client_width){
		var p_in_room = io.sockets.clients(newroom), 
			opponent = null,
			player_x_pos = 0;
		if(socket.room == newroom || p_in_room.length >= 2){
			if(socket.room == newroom) socket.emit('incurrentroom');
			else socket.emit('roomfull');
			return;
		}
		socket.leave(socket.room);
		if(p_in_room.length == 1){ //setClient x pos according to player in room
			opponent = p_in_room[0].player;
			player_x_pos = (opponent.x == 0) ? client_width - socket.player.width : 0;
		} else{ //first player is always on the left
			player_x_pos = 0;
		}
		socket.broadcast.to(socket.room).emit('opponentleave');
		socket.join((socket.room = (newroom)));
		socket.player.x = player_x_pos;
		connexionMessages(socket, opponent);
	});
	
	socket.on('disconnect', function(){
		socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.player.username + ' has disconnected');
		socket.broadcast.to(socket.room).emit('removeopponent');
		var oldroom = socket.room;
		socket.leave(socket.room);
		io.sockets.emit('updaterooms', getAllRooms(), oldroom);
		/*if(io.sockets.clients(socket.room).length == 0){ //if room is empty, then remove it
			rooms.splice(rooms.indexOf(socket.room), 1);
			socket.broadcast.emit('removeroom', socket.room);
		}*/
	});
	
	//send messages to users after a client connect
	function connexionMessages(s, opponent){
		s.broadcast.to(s.room).emit('newopponent', s.player);
		s.emit('newplayers', {local_player: s.player, opponent: opponent}, s.room);
		io.sockets.in(s.room).emit('ballposition', generateBallPos()); //send ballPosition to all players in the room
		//s.emit('updaterooms', rooms, s.room);
		//io.sockets.in(s.room).emit('updaterooms', getAvailableRooms(s.room), s.room);
		io.sockets.emit('updaterooms', getAllRooms(), s.room);
	}
	
	function generateBallPos(){
		var random = Math.floor(Math.random()*(7)+1); //generate nb between 7 and 1
		var ball_vx = (random % 2 == 0) ? 5 : -5;
		var ball_vy = (random % 2 == 0) ? -5 : 5;
		return {vx: ball_vx, vy: ball_vy};
	}
	
	/**
	 * Return a list of available rooms, each containing players name
	 * param current_room corresponds current client room, include this room even if there are two player,
	 * in available_rooms
	 * [{room_name: 'room_name', players: [username, ...]}]
	 */
	function getAllRooms(){
		var all_rooms = [];
		for(var i = 0 ; i < rooms.length ; i++){
			var room = rooms[i], room_infos = {}; //if will contains room name and players name on this room
			var clients = io.sockets.clients(room); //get nb of clients in room
			room_infos.room_name = room;
			room_infos.players = [];
			for(var j = 0 ; j < clients.length ; j++){
				room_infos.players.push(clients[j].player.username);
			}
			all_rooms.push(room_infos);
		}
		return all_rooms;
	}
	/*function getAvailableRooms(current_room){
		var available_rooms = [];
		for(var i = 0 ; i < rooms.length ; i++){
			var room = rooms[i], room_infos = {}; //if will contains room name and players name on this room
			var clients = io.sockets.clients(room); //get nb of clients in room
			if(clients.length >= 2 && room != current_room) continue; //don't get room when there are two players
			room_infos.room_name = room;
			room_infos.players = [];
			for(var j = 0 ; j < clients.length ; j++){
				room_infos.players.push(clients[j].player.username);
			}
			available_rooms.push(room_infos);
		}
		return available_rooms;
	}*/
});