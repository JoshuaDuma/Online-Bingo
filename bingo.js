var express = require("express");
var Server = require("http").Server;
var session = require("express-session");

var app = express();
var server = Server(app);
var io = require("socket.io")(server);
const expressSitemapXml = require('express-sitemap-xml');
const bodyParser = require('body-parser');

console.log(app.get)
var site = {
  link: 'https://bingo.joshuaduma.ca/',
  pages: [
    "/"
  ],
};

app.use('/robots.txt', function (req, res) {
  res.type('text/plain')
  res.send("User-agent: *\nSitemap: " + site.link + "sitemap.xml");
});

app.use(expressSitemapXml(getUrls, site.link));

function getUrls() {
  return site.pages;
}

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());

var prerender = require('prerender-node');
prerender.protocol = 'https';
app.use(prerender.set('prerenderServiceUrl', 'http://localhost:3000/'));

var mysql = require('mysql2');

var fun = mysql.createConnection({
  host: 'localhost',
  database: 'fun',
  user: 'fun',
  password: 'afafDFAF2#!$!$!414aFDFAGAGFGafga',
  port: 3306
}); // Connect to mysql.

var sessionMiddleware = session({
  saveUninitialized: false,
  secret: 'keyboard cat',
  resave: false,
});

io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

app.use(sessionMiddleware);

app.use(express.static('./'))

server.listen(2021);

function saveGame() {
  /*
   console.log("INSERT INTO fun.fun (`id`, `data`) VALUES (0, '" + JSON.stringify({
    rooms: rooms,
    adminKeys: adminKeys
  }) + "') ON DUPLICATE KEY UPDATE `data` = '" + JSON.stringify({
    rooms: rooms,
    adminKeys: adminKeys
  }) + "'");
  */
  fun.query("INSERT INTO fun.fun (`id`, `data`) VALUES (0, ?) ON DUPLICATE KEY UPDATE `data` = ?", [JSON.stringify({
    rooms: rooms,
    adminKeys: adminKeys
  }),
  JSON.stringify({
    rooms: rooms,
    adminKeys: adminKeys
  })
  ], function (err) {
    if (err) throw err;
  }); // Save games.
}

function everythingGrid(array) {
  /* Same order of questions for everyone. */
  newObj = [];

  for (var i = 0; i < array.length; i++) {
    newObj.push({
      text: array[i],
      selected: false,
      index: i,
      isEnabled: false,
    });
  }

  return newObj;
} // Craete the same grid for the remaining calls variable.

var questionLimit = 25 - 1; // Stop providing more than the limit for questions.

function shuffleGrid(array) {
  /* Shuffled order of questions for everyone. */
  newObj = [];

  for (var i = 0; i < array.length; i++) {
    newObj.push({
      text: array[i],
      selected: false,
      index: i,
      isEnabled: false,
    });
  }

  /* For random order or questions. */

  var currentIndex = array.length,
    temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = newObj[currentIndex];
    newObj[currentIndex] = newObj[randomIndex];
    newObj[randomIndex] = temporaryValue;
  }

  outputObj = [];

  for (var i = 0; i < array.length; i++) {
    outputObj.push(newObj[i]);

    if (i >= questionLimit) {
      break;
    } // Don't supply more than the maximum allowed questions per board.
  }

  return outputObj;
} // Create a random grid for the player.

function objSize(obj) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
}; // Get an object's size.

function makeid(length) {
  var result = [];
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() *
      charactersLength)));
  }
  return result.join('');
}

var rooms = {}; // Stores all room data.

var adminKeys = {}; // Stores all admin key data.

fun.query('SELECT * FROM fun.fun', function (err, result) {
  if (err) throw err;
  if (result.length > 0) {
    var data = result[0].data;
    rooms = data.rooms; // Stores all room data.

    adminKeys = data.adminKeys; // Stores all admin key data.
  }
});

io.on('connection', function (socket) {
  console.log(socket.request.session);
  if (!socket.request.session.uuid) {
    socket.request.session.uuid = socket.id
  } // Check if user has a uuid, set one if not.

  var remainingCalls = [];
  var userID = socket.request.session.uuid;
  var admin = false;
  var player = {
    name: "Player#" + Math.floor(Math.random() * 1000),
    showModal: false
  };

  if (socket.request.session.playerName) {
    player.name = socket.request.session.playerName
  } // If the player name exists, reload it.     

  var roomID = null;

  if (socket.request.session.previousGame) {
    socket.emit('previousGame', socket.request.session.previousGame); // Send response if user joined a room.
  } // If the roomID exists, send to the user as a choice to re-join the last game.

  socket.emit('playerName', JSON.stringify(player)); // Send player ID. 
  socket.emit('roomJoined', JSON.stringify({
    roomID: roomID,
    bool: false
  })); // Send response if user joined a room. // Send response if user joined a room.

  /* if (queryObject.adminKey == "215135fadfadhjkadfbkfbadkfhda4124") {
    admin = true;
  } // If the player is an admin */

  socket.on('createRoom', function (response) {
    console.log("Creating Room!");
    var info = JSON.parse(response);
    console.log(info);

    roomID = makeid(5);
    console.log(roomID);

    socket.join(roomID); // Join newely created room.

    rooms[roomID] = {};
    rooms[roomID].data = {
      players: {},
      admin: {
        calls: [],
        currentIndex: null,
        roomName: null
      }
    };

    admin = true;
    socket.request.session.admin = admin; // Become and stay the admin for this room.

    player.name = info.playerName;
    rooms[roomID].data.admin.answers = info.questions;
    rooms[roomID].data.admin.roomName = info.roomName; // Get room name.
    rooms[roomID].data.admin.roomID = roomID; // Get room name. 
    rooms[roomID].data.admin.maxPlayers = info.maxPlayers;

    rooms[roomID].data.players[userID] = {};
    rooms[roomID].data.players[userID].grid = shuffleGrid(rooms[roomID].data.admin.answers);
    rooms[roomID].data.players[userID].name = player.name;
    rooms[roomID].data.players[userID].gridCols = Math.floor(Math.sqrt(objSize(rooms[roomID].data.players[userID].grid)));
    rooms[roomID].data.players[userID].admin = admin;
    rooms[roomID].data.players[userID].win = false;
    rooms[roomID].data.joinedRoom = true;
    rooms[roomID].data.players[userID].isActive = true;

    remainingCalls = everythingGrid(rooms[roomID].data.admin.answers); // Reset remaining calls.
    rooms[roomID].data.remainingCalls = remainingCalls;

    io.to(roomID).emit('players', JSON.stringify(rooms[roomID].data)); // Send all rooms[roomID].data.

    socket.emit('playerID', userID); // Send player ID.
    socket.emit('playerName', JSON.stringify(player)); // Send player ID. 

    socket.emit('roomJoined', JSON.stringify({
      roomID: roomID,
      bool: true
    })); // Send response if user joined a room.

    adminKeys[roomID] = makeid(26);
    console.log(adminKeys[roomID]);

    socket.emit('adminKey', adminKeys[roomID]); // Send the user an adminKey

    saveGame();
  });

  socket.on('joinRoom', function (reesponse) {
    var info = JSON.parse(reesponse);

    console.log("LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL");

    player.name = info.playerName;
    if (info.roomID in rooms) {
      console.log("-----------");
      console.log(info.roomID);
      console.log(info);
      console.log(adminKeys);
      console.log(info.adminKey);
      console.log("-----------");
      if (info.adminKey == adminKeys[info.roomID]) {
        admin = true;
      } else {
        admin = false;
      } // If the user joining was the admin, continue to be an admin.
      roomID = info.roomID; // Set room ID for the session.

      socket.request.session.playerName = player.name; // Save player name in cookie.
      socket.request.session.previousGame = roomID; // Save last game in cookie.

      socket.join(roomID);

      var isReturningPlayer = false;
      for (key in rooms[roomID].data.players) {
        if (key == info.userID) {
          isReturningPlayer = true;
        }
      }

      if (typeof info.userID !== 'undefined' && isReturningPlayer) {
        userID = info.userID;
        rooms[roomID].data.players[userID].isActive = true;
        console.log(info.userID);
      } // Get UserID, if provided by the user. DELETE FOR TESTING
      else {
        rooms[roomID].data.players[userID] = {};
        rooms[roomID].data.players[userID].grid = shuffleGrid(rooms[roomID].data.admin.answers);
        rooms[roomID].data.players[userID].name = player.name;
        rooms[roomID].data.players[userID].gridCols = Math.floor(Math.sqrt(objSize(rooms[roomID].data.players[userID].grid)));
        rooms[roomID].data.players[userID].admin = admin;
        rooms[roomID].data.players[userID].win = false;
        rooms[roomID].data.players[userID].isActive = true;
        for (key in rooms[roomID].data.admin.calls) {
          rooms[roomID].data.players[userID].clickedCurrent = false;
          for (key2 in rooms[roomID].data.players[userID].grid) {
            if (rooms[roomID].data.admin.calls[key].index == rooms[roomID].data.players[userID].grid[key2].index) {
              rooms[roomID].data.players[userID].grid[key2].isEnabled = true;
            }
          }
        }
      }

      console.log(admin);
      console.log(objSize(rooms[roomID].data.players));
      console.log(rooms[roomID].data.admin.maxPlayers);
      console.log("0000000000000000000000000000000000");
      console.log(rooms[roomID].data.remainingCalls);

      /*
      if(!admin && objSize(rooms[roomID].data.players) >= (rooms[roomID].data.admin.maxPlayers + 1)){
        socket.emit('roomjoinError', {res: true, msg: "Room is full."}); // Send error.

        socket.emit('roomJoined', JSON.stringify({
          roomID: roomID,
          bool: false
        })); // Send response if user joined a room.

        return;
      } // Check if room is full. If the room is full, reject the user.
      */

      socket.emit('playerID', userID); // Send player ID.
      socket.emit('playerName', JSON.stringify(player)); // Send player ID. 

      // remainingCalls = everythingGrid(rooms[roomID].data.admin.answers); // Reset remaining calls.
      // rooms[roomID].data.remainingCalls = remainingCalls;

      io.to(roomID).emit('players', JSON.stringify(rooms[roomID].data)); // Send all rooms[roomID].data.

      socket.emit('playerID', userID); // Send player ID.
      socket.emit('playerName', JSON.stringify(player)); // Send player ID. 

      socket.emit('roomjoinError', {
        res: false,
        msg: ""
      }); // Send success.

      socket.emit('roomJoined', JSON.stringify({
        roomID: roomID,
        bool: true
      })); // Send response if user joined a room.
    } // If the user chooses a valid room.
    else {
      socket.emit('roomjoinError', {
        res: true,
        msg: "Room does not exist."
      }); // Send error.

      socket.emit('roomJoined', JSON.stringify({
        roomID: roomID,
        bool: false
      })); // Send response if user joined a room.
    }

    saveGame();
  })

  socket.on('callAnswer', function () {
    if (admin) {
      remainingCalls = rooms[roomID].data.remainingCalls;
      var i = Math.floor(Math.random() * remainingCalls.length); // Select random answer.
      if (remainingCalls.length != 0 && i > -1) {
        rooms[roomID].data.admin.calls.push({
          index: remainingCalls[i].index,
          name: remainingCalls[i].text
        });
        rooms[roomID].data.admin.currentIndex = remainingCalls[i].index;
        remainingCalls.splice(i, 1);
        rooms[roomID].data.remainingCalls = remainingCalls;

        for (key in rooms[roomID].data.admin.calls) {
          for (key2 in rooms[roomID].data.players) {
            for (key3 in rooms[roomID].data.players[key2].grid) {
              rooms[roomID].data.players[key2].clickedCurrent = false;
              if (rooms[roomID].data.admin.calls[key].index == rooms[roomID].data.players[key2].grid[key3].index) {
                rooms[roomID].data.players[key2].grid[key3].isEnabled = true;
              }
            }
          }
        }

        rooms[roomID].data.meta = {
          indexCalled: rooms[roomID].data.admin.currentIndex
        };
        io.to(roomID).emit('players', JSON.stringify(rooms[roomID].data)); // Send all rooms[roomID].data.
      } // Remove from list.
    } // Admins only.

    saveGame();
  });

  socket.on('resetGame', function () {
    if (admin) {
      for (key in rooms[roomID].data.players) {
        rooms[roomID].data.players[key].clickedCurrent = false;
        rooms[roomID].data.players[key].win = false;
        rooms[roomID].data.players[key].grid = shuffleGrid(rooms[roomID].data.admin.answers);
      } // Reset boards.

      remainingCalls = everythingGrid(rooms[roomID].data.admin.answers); // Reset remaining calls.
      rooms[roomID].data.remainingCalls = remainingCalls;
      rooms[roomID].data.admin.calls = []; // Reset calls
      rooms[roomID].data.admin.currentIndex = null; // Reset current index.
      io.to(roomID).emit('players', JSON.stringify(rooms[roomID].data)); // Send all rooms[roomID].data.
    } // WARNING. RESETS THE GAME.

    saveGame();
  });

  socket.on('playerNameChange', function (response) {
    try {
      rooms[roomID].data.players[userID].name = response.substring(1, response.length - 1);;
      console.log(rooms[roomID].data.players[userID].name);
      io.to(roomID).emit('players', JSON.stringify(rooms[roomID].data)); // Send all rooms[roomID].data.
    } catch { }

    saveGame();
  }); // Player changed name

  socket.on('clickedBlock', function (response) {
    console.log(roomID);
    try {
      var block = JSON.parse(response);
      console.log("BLock ID: " + block.blockID);

      for (key in rooms[roomID].data.players[userID].grid) {
        if (rooms[roomID].data.players[userID].grid[key].index == block.blockID) {
          rooms[roomID].data.players[userID].grid[key].selected = block.status;
        }
      }

      //rooms[roomID].data.players[userID].grid[block.blockID].selected = block.status;
      if (block.status && block.blockID == rooms[roomID].data.admin.currentIndex) {
        rooms[roomID].data.players[userID].clickedCurrent = true;
      } // Broadcast that the player choose the same block that is called.
      if (!block.status && block.blockID == rooms[roomID].data.admin.currentIndex) {
        rooms[roomID].data.players[userID].clickedCurrent = false;
      } // Reverse if player unclicks a block.

      /* Caution: Win condition spaghetti code. */
      var temp = [];
      var colSize = rooms[roomID].data.players[userID].gridCols;
      winMatrix = [];

      for (var i = 0; i < objSize(rooms[roomID].data.players[userID].grid); ++i) {
        if (i % colSize == 0 && i >= colSize) {
          winMatrix.push(temp);
          temp = [];
        }
        if (rooms[roomID].data.players[userID].grid[i].selected) {
          temp.push("Y");
        } else {
          temp.push("N");
        }
      }

      winMatrix.push(temp);
      temp = [];
      var win = false;

      var rowWin = [];
      for (var i = 0; i < winMatrix.length; ++i) {
        rowWin.push("Y");
      } // Build winning row condition.

      var colWin = []
      for (var i = 0; i < winMatrix.length; ++i) {
        colWin.push("Y");
      } // Build winning column.

      // Win conditions.
      var colTemp = [];
      for (var i = 0; i < winMatrix.length; ++i) {
        // Check for row win.
        if (winMatrix[i].join() == rowWin.join()) {
          win = true;
        }
        colTemp = [];
        // Check for column win.
        for (var j = 0; j < winMatrix[i].length; ++j) {
          colTemp.push(winMatrix[j][i]);
        }
        if (colTemp.join() == colWin.join()) {
          win = true;
        }
      }

      // Front diagonal win.
      var j = 0;
      colTemp = [];
      for (var i = 0; i < winMatrix.length; ++i) {
        colTemp.push(winMatrix[i][j]);
        j++;
      }
      if (colTemp.join() == colWin.join()) {
        win = true;
      }

      // Back diagonal win.
      var j = 0;
      colTemp = [];
      for (var i = winMatrix.length - 1; i >= 0; i--) {
        colTemp.push(winMatrix[i][j]);
        j++;
      }
      if (colTemp.join() == colWin.join()) {
        win = true;
      }

      rooms[roomID].data.players[userID].win = win;

      /* End caution. */

      // Check win conditions
      io.to(roomID).emit('players', JSON.stringify(rooms[roomID].data)); // Send all rooms[roomID].data.
    } catch {

    }

    saveGame();
  }); // Get the client's reponse.

  socket.on('adminCtl', function () {

  });

  socket.on('disconnect', function (socket) { // player disconnect event
    console.log("Removing player");
    try {
      // console.log(delete rooms[roomID].data.players[userID]);
      for (key in rooms[roomID].data.admin.calls) {
        rooms[roomID].data.players[userID].clickedCurrent = false;
      }
      rooms[roomID].data.players[userID].isActive = false; // Make player inactive;
      socket.leave(roomID);
      io.to(roomID).emit('players', JSON.stringify(rooms[roomID].data)); // Send all rooms[roomID].data.
    } catch { }

    saveGame();
  });

});