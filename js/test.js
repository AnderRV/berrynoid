if (!Function.prototype.bind) {
  Function.prototype.bind = function(obj) {
    var slice = [].slice,
        args  = slice.call(arguments, 1),
        self  = this,
        nop   = function () {},
        bound = function () {
          return self.apply(this instanceof nop ? this : (obj || {}), args.concat(slice.call(arguments)));   
        };
    nop.prototype   = self.prototype;
    bound.prototype = new nop();
    return bound;
  };
}

if (!Object.create) {
  Object.create = function(base) {
    function F() {};
    F.prototype = base;
    return new F();
  }
}

if (!Object.construct) {
  Object.construct = function(base) {
    var instance = Object.create(base);
    if (instance.initialize)
      instance.initialize.apply(instance, [].slice.call(arguments, 1));
    return instance;
  }
}

if (!Object.extend) {
  Object.extend = function(destination, source) {
    for (var property in source) {
      if (source.hasOwnProperty(property))
        destination[property] = source[property];
    }
    return destination;
  };
}

//

//=============================================================================
// GAME
//=============================================================================

Game = {

  compatible: function() {
    return Object.create &&
           Object.extend &&
           Function.bind &&
           document.addEventListener && // HTML5 standard, all modern browsers that support canvas should also support add/removeEventListener
           Game.ua.hasCanvas
  },

  start: function(id, game, cfg) {
    if (Game.compatible())
      return Object.construct(Game.Runner, id, game, cfg).game; // return the game instance, not the runner (caller can always get at the runner via game.runner)
  },

  ua: function() { // should avoid user agent sniffing... but sometimes you just gotta do what you gotta do
    var ua  = navigator.userAgent.toLowerCase();
    var key = key || ((ua.indexOf("opera")   > -1) ? "opera"   : null);
        key = key || ((ua.indexOf("firefox") > -1) ? "firefox" : null);
        key = key || ((ua.indexOf("chrome")  > -1) ? "chrome"  : null);
        key = key || ((ua.indexOf("safari")  > -1) ? "safari"  : null);
        key = key || ((ua.indexOf("msie")    > -1) ? "ie"      : null);

    try {
      var re      = (key == "ie") ? "msie (\\d)" : key + "\\/(\\d\\.\\d)"
      var matches = ua.match(new RegExp(re, "i"));
      var version = matches ? parseFloat(matches[1]) : null;
    } catch (e) {}

    return {
      full:      ua, 
      name:      key + (version ? " " + version.toString() : ""),
      version:   version,
      hasCanvas: (document.createElement('canvas').getContext),
      hasAudio:  (typeof(Audio) != 'undefined')
    }
  }(),

  addEvent:    function(obj, type, fn) { obj.addEventListener(type, fn, false);    },
  removeEvent: function(obj, type, fn) { obj.removeEventListener(type, fn, false); },

  ready: function(fn) {
    if (Game.compatible())
      Game.addEvent(document, 'DOMContentLoaded', fn);
  },

  createCanvas: function() {
    return document.createElement('canvas');
  },

  createAudio: function(src) {
    try {
      var a = new Audio(src);
      a.volume = 0.1; // lets be real quiet please
      return a;
    } catch (e) {
      return null;
    }
  },

  loadImages: function(sources, callback) { /* load multiple images and callback when ALL have finished loading */
    var images = {};
    var count = sources ? sources.length : 0;
    if (count == 0) {
      callback(images);
    }
    else {
      for(var n = 0 ; n < sources.length ; n++) {
        var source = sources[n];
        var image = document.createElement('img');
        images[source] = image;
        Game.addEvent(image, 'load', function() { if (--count == 0) callback(images); });
        image.src = source;
      }
    }
  },

  random: function(min, max) {
    return (min + (Math.random() * (max - min)));
  },

  timestamp: function() { 
    return new Date().getTime();
  },

  KEY: {
    BACKSPACE: 8,
    TAB:       9,
    RETURN:   13,
    ESC:      27,
    SPACE:    32,
    LEFT:     37,
    UP:       38,
    RIGHT:    39,
    DOWN:     40,
    DELETE:   46,
    HOME:     36,
    END:      35,
    PAGEUP:   33,
    PAGEDOWN: 34,
    INSERT:   45,
    ZERO:     48,
    ONE:      49,
    TWO:      50,
    A:        65,
    L:        76,
    P:        80,
    Q:        81,
    TILDA:    192
  },

  TAP: {
    TAP:       'tap',
    DOUBLETAP: 'doubleTap'
  },

  //-----------------------------------------------------------------------------

  Runner: {

    initialize: function(id, game, cfg) {
      this.cfg          = Object.extend(game.Defaults || {}, cfg || {}); // use game defaults (if any) and extend with custom cfg (if any)
      this.fps          = this.cfg.fps || 60;
      this.interval     = 1000.0 / this.fps;
      this.canvas       = document.getElementById(id);
      this.width        = this.cfg.width  || this.canvas.offsetWidth;
      this.height       = this.cfg.height || this.canvas.offsetHeight;
      this.front        = this.canvas;
      this.front.width  = this.width;
      this.front.height = this.height;
      this.back         = Game.createCanvas();
      this.back.width   = this.width;
      this.back.height  = this.height;
      this.front2d      = this.front.getContext('2d');
      this.back2d       = this.back.getContext('2d');
      this.addEvents();
      this.resetStats();

      this.game = Object.construct(game, this, this.cfg); // finally construct the game object itself
    },

    start: function() { // game instance should call runner.start() when its finished initializing and is ready to start the game loop
      this.lastFrame = Game.timestamp();
      this.timer     = setInterval(this.loop.bind(this), this.interval);
    },

    stop: function() {
      clearInterval(this.timer);
    },

    loop: function() {
      var start  = Game.timestamp(); this.update((start - this.lastFrame)/1000.0); // send dt as seconds
      var middle = Game.timestamp(); this.draw();
      var end    = Game.timestamp();
      this.updateStats(middle - start, end - middle);
      this.lastFrame = start;
    },

    update: function(dt) {
      this.game.update(dt);
    },

    draw: function() {
      this.back2d.clearRect(0, 0, this.width, this.height);
      this.game.draw(this.back2d);
      this.drawStats(this.back2d);
      this.front2d.clearRect(0, 0, this.width, this.height);
      this.front2d.drawImage(this.back, 0, 0);
    },

    resetStats: function() {
      this.stats = {
        count:  0,
        fps:    0,
        update: 0,
        draw:   0, 
        frame:  0  // update + draw
      };
    },

    updateStats: function(update, draw) {
      if (this.cfg.stats) {
        this.stats.update = Math.max(1, update);
        this.stats.draw   = Math.max(1, draw);
        this.stats.frame  = this.stats.update + this.stats.draw;
        this.stats.count  = this.stats.count == this.fps ? 0 : this.stats.count + 1;
        this.stats.fps    = Math.min(this.fps, 1000 / this.stats.frame);
      }
    },

    drawStats: function(ctx) {
      if (this.cfg.stats) {
        ctx.fillStyle = 'white';
        ctx.font = '9pt sans-serif';
        ctx.fillText("frame: "  + this.stats.count,         this.width - 100, this.height - 75);
        ctx.fillText("fps: "    + this.stats.fps,           this.width - 100, this.height - 60);
        ctx.fillText("update: " + this.stats.update + "ms", this.width - 100, this.height - 45);
        ctx.fillText("draw: "   + this.stats.draw   + "ms", this.width - 100, this.height - 30);
      }
    },

    addEvents: function() {
      Game.addEvent(document, 'keydown',      this.onkeydown.bind(this));
      Game.addEvent(document, 'keyup',        this.onkeyup.bind(this));
      Game.addEvent(document, 'tap',          this.tapevent.bind(this));
      Game.addEvent(document, 'doubleTap',    this.tapevent.bind(this));
    },

    onkeydown: function(ev) { if (this.game.onkeydown) this.game.onkeydown(ev.keyCode); },
    onkeyup:   function(ev) { if (this.game.onkeyup)   this.game.onkeyup(ev.keyCode);   },
    tapevent:  function(ev) { if (this.game.tapevent)  this.game.tapevent(ev);          },

    hideCursor: function() { this.canvas.style.cursor = 'none'; },
    showCursor: function() { this.canvas.style.cursor = 'auto'; },

    alert: function(msg) {
      var result;
      this.stop(); // alert blocks thread, so need to stop game loop in order to avoid sending huge dt values to next update
      // if(Notification) {
      //   console.log(Notification);
      //   result = new Notification(msg);
      // } else {
      //   result = window.alert(msg);
      // }

      result = window.alert(msg);

      this.start();
      return result;
    },

    confirm: function(msg) {
      var result;
      this.stop(); // alert blocks thread, so need to stop game loop in order to avoid sending huge dt values to next update
      result = window.confirm(msg);
      this.start();
      return result;
    }

    //-------------------------------------------------------------------------

  } // Game.Runner
} // Game


//=============================================================================
// Ark
//=============================================================================

Ark = {
  Defaults: {
    width:        696,
    height:       800,
    wallWidth:    2,
    paddleWidth:  100,
    paddleHeight: 10,
    blockWidth:   58,
    blockHeight:  29,
    bottomMargin: 10,
    paddleSpeed:  1,
    ballSpeed:    2,
    ballMaxSpeed: 1,
    ballMinSpeed: 3,
    ballAccel:    0,
    ballRadius:   7,
    lives:        5
  },

  Colors: {
    walls:             'white',
    lives:             'white',
    paused:            'red',
    unbreakableBlocks: 'gray',
    ball:              'white'
  },

  BlockImgs: [ 
    { lives: -1, src: 'block_0.png' },
    { lives: 1, src: 'block_1.png' },
    { lives: 2, src: 'block_2.png' },
    { lives: 3, src: 'block_3.png' }
  ],

  //-----------------------------------------------------------------------------

  initialize: function(runner, cfg) {
      this.cfg         = cfg;
      this.lives       = this.cfg.lives;
      this.runner      = runner;
      this.width       = runner.width;
      this.height      = runner.height;
      this.playing     = false;
      this.court       = Object.construct(Ark.Court,  this);
      this.paddle      = Object.construct(Ark.Paddle, this);
      this.ball        = Object.construct(Ark.Ball,   this);
      this.blocks      = [];
      this.isPaused    = false;
      this.level       = 0;
      this.images      = {};

      this.loadImages(this.startRunner);
  },

  startRunner: function() {
    ark.createBlocks(ark.level);
    ark.runner.start();
  },

  loadImages: function(callback) {
    var blockLen = Ark.BlockImgs.length,
      i = 0,
      imgRoute,
      id,
      loadedImages = 0;

    for (i; i < blockLen; i++) {
      id       = Ark.BlockImgs[i].lives;
      imgRoute = Ark.BlockImgs[i].src;

      this.images[id] = new Image();
      this.images[id].onload = function() {
        if(++loadedImages >= blockLen) {
          callback();
        }
      };
      this.images[id].src = imgRoute; 
    };
  },

  randomColor: function() {
    return "rgb(" + Math.round(Game.random(0,255)) + ", " + Math.round(Game.random(0,255)) + ", " + Math.round(Game.random(0,255)) + ")";
  },

  createBlocks: function(level) {

    //10 columns ; 12 rows
    var matrix = [];
    this.blocks = [];

    // var matrix = [
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1st
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 3
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 4
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 5
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 6
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 7
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 8
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 9
    //   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10
    // ];

    switch(level) {
      case 0:
        matrix = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
          [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0], // 3
          [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0], // 4
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 5
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 6
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 7
          [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0], // 8
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 9
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10
        ];
        break;
      case 1:
        matrix = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
          [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], // 2
          [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], // 3
          [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], // 4
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 5
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 6
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 7
          [0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0], // 8
          [0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0], // 9
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10
        ];
        break;
      case 2:
        matrix = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 2
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 3
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 4
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 5
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 6
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 7
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 8
          [0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0], // 9
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10
        ];
        break;
      case 3:
        matrix = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
          [0, 3, 2, 1, 0, 1, 1, 0, 1, 2, 3, 0], // 3
          [0, 1, 1, 1, 0, 2, 2, 0, 1, 1, 1, 0], // 4
          [0, 1, 1, 1, 0, 3, 3, 0, 1, 1, 1, 0], // 5
          [0, 1, 1, 2, 3, -1, -1, 3, 2, 1, 1, 0], // 6
          [0, 1, 2, 3, -1, -1, -1, -1, 3, 2, 1, 0], // 7
          [0, -1, -1, -1, 1, 2, 2, 1, -1, -1, -1, 0], // 8
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 9
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10
        ];
        break;
      default:
        matrix = []
        break;
    }

    if(matrix) {
      var //rowLen = this.cfg.width / this.cfg.blockWidth,
        //columnLen = (this.cfg.height/2) / this.cfg.blockHeight,
        columnLen = matrix.length,
        rowLen = matrix[0].length,
        r = 0,
        c = 0;
      for (c; c < columnLen - 1; c++) {
        for (r = 0; r < rowLen - 1; r++) {
            if(matrix[c][r] !== 0) {
              this.blocks.push(
                Object.construct(Ark.Block, this, this.cfg.wallWidth + this.cfg.blockWidth * r, this.cfg.wallWidth + this.cfg.blockHeight * c, matrix[c][r], this.randomColor())
              );
            }
        };
      };
    }
  },

  pause: function() {
    if(this.playing && this.lives > 0) {
      //TODO
      /*
      if(!this.isPaused) {
        this.playing = false;
        this.runner.showCursor();
        this.isPaused = true;
      } else {
        this.playing = true;
        this.runner.hideCursor();
        this.isPaused = false;
      }
      */
    }
  },

  start: function() {
    if (!this.playing && this.lives > 0) {
      this.playing = true;
      this.ball.reset();
      this.runner.hideCursor();
    }
  },

  launch: function() {
    if (this.playing && this.lives > 0) {
      this.ball.launch();
    }
  },

  stop: function(ask) {
    if (this.playing) {
      if (!ask || this.runner.confirm('Abandon game in progress ?')) {
        this.playing = false;
        this.runner.showCursor();
      }
    }
  },

  lost: function() {
    this.stop();
    this.lives -= 1;
    if(this.lives > 0) {
      this.start();
    } else {
      this.runner.alert('You LOST the GAME');
    }
  },

  update: function(dt) {
    this.paddle.update(dt, this.ball);
    if (this.playing) {
      var dx = this.ball.dx;
      var dy = this.ball.dy;
      this.ball.update(dt, this.paddle, this.blocks);
      if (this.ball.bottom >= this.height - ark.cfg.wallWidth)
        this.lost();
    }
  },

  draw: function(ctx) {
    this.court.draw(ctx);
    this.paddle.draw(ctx);
    if (this.playing)
      this.ball.draw(ctx);

    for (var i = this.blocks.length - 1; i >= 0; i--) {
      this.blocks[i].draw(ctx);
    };
    
    ctx.fillStyle = Ark.Colors.lives;
    ctx.font = "20pt Arial";
    ctx.fillText("lives: " + this.lives, 30, 30);

    if(this.isPaused) {
      ctx.fillStyle = Ark.Colors.paused;
      ctx.fillText("PAUSED", this.width - 20, 10);
    }
  },

  onkeydown: function(keyCode) {
    switch(keyCode) {
      case Game.KEY.RETURN: this.start();             break;
      case Game.KEY.SPACE:  this.launch();            break;
      case Game.KEY.P:      this.pause();             break;
      case Game.KEY.ESC:    this.stop(true);          break;
      case Game.KEY.LEFT:   this.paddle.moveLeft(1);   break;
      case Game.KEY.RIGHT:  this.paddle.moveRight(1);  break;
    }
  },

  onkeyup: function(keyCode) {
    switch(keyCode) {
      case Game.KEY.LEFT:  this.paddle.stopMovingLeft();   break;
      case Game.KEY.RIGHT: this.paddle.stopMovingRight();  break;
    }
  },

  tapevent:  function(ev) {
    switch(ev.type) {
      case Game.TAP.TAP:       this.launch(); break;
      case Game.TAP.DOUBLETAP: this.start();  break;
    }
  },

  devicemotion: function(ev) {
    var x = ev.acceleration.x,
      y = ev.acceleration.y;

      if(x > 1) {
        this.paddle.stopMovingLeft();
        this.paddle.moveRight(x/4);
      } else if(x < -1) {
        this.paddle.stopMovingRight();
        this.paddle.moveLeft(-x/4);
      } else {
        this.paddle.stopMovingLeft();
        this.paddle.stopMovingRight();
      }
  },

  checkFinished: function() {
    var len = this.blocks.length,
      i = 0,
      isFinished = true;

    for (i; i < len; i++) {
      if(this.blocks[i].lives > 0) {
        isFinished = false;
        break;
      }
    };

    if(isFinished) {
      this.playing = false;
      this.level += 1;
      this.createBlocks(this.level);
      this.ball.reset();
    }
  },

  //=============================================================================
  // COURT
  //=============================================================================

  Court: {

    initialize: function(ark) {
      var w  = ark.width;
      var h  = ark.height;
      var ww = ark.cfg.wallWidth;

      this.ww    = ww;
      this.walls = [];
      this.walls.push({x: 0, y: 0,      width: w, height: ww});
      this.walls.push({x: 0, y: h - ww, width: w, height: ww});
      this.walls.push({x: 0, y: 0,      width: ww, height: h - ww});
      this.walls.push({x: w - ww, y: 0,   width: w, height: h -ww});
    },

    draw: function(ctx) {
      ctx.fillStyle = Ark.Colors.walls;
      for(var n = 0 ; n < this.walls.length ; n++)
        ctx.fillRect(this.walls[n].x, this.walls[n].y, this.walls[n].width, this.walls[n].height);
    }

  },

  //=============================================================================
  // BLOCK
  //=============================================================================

  Block: {

    initialize: function(ark, x, y, lives, color) {
      this.ark      = ark;
      this.width    = ark.cfg.blockWidth;
      this.height   = ark.cfg.blockHeight;
      this.lives    = lives || 1;
      this.color    = color;
      this.gradient = null;
      this.img      = ark.images[this.lives];

      this.setpos(x, y);
    },

    setpos: function(x, y) {
      this.x      = x;
      this.y      = y;
      this.left   = this.x;
      this.right  = this.left + this.width;
      this.top    = this.y;
      this.bottom = this.y + this.height;
    },

    hit: function() {
      if(this.lives > 0) {
        this.lives -= 1;
        if(this.lives === 0) {
          this.delete();
        } else {
          this.gradient = null;
        }
      }
    },

    delete: function() {
      this.width  = 0;
      this.height = 0;
      this.setpos(0, 0);
    },

    generateGradient: function(ctx) {
      switch(this.lives) {
        case -1:
          this.color = Ark.Colors.unbreakableBlocks;
          this.gradient = ctx.createLinearGradient(this.left, this.top, this.right, this.bottom);
          this.gradient.addColorStop(0., this.color);
          break;
        case 1:
          this.gradient = ctx.createLinearGradient(this.left, this.top, this.right, this.bottom);
          this.gradient.addColorStop(0., this.color);
          this.gradient.addColorStop(0.5, '#fff');
          this.gradient.addColorStop(1., this.color);
          break;
        case 2:
          this.gradient = ctx.createLinearGradient(this.left, this.top, this.right, this.bottom);
          this.gradient.addColorStop(0., this.color);
          this.gradient.addColorStop(0.25, '#fff');
          this.gradient.addColorStop(0.5, this.color);
          this.gradient.addColorStop(0.75, '#fff');
          this.gradient.addColorStop(1., this.color);
          break;
        case 3:
          this.gradient = ctx.createLinearGradient(this.left, this.top, this.right, this.bottom);
          this.gradient.addColorStop(0., this.color);
          this.gradient.addColorStop(0.17, '#fff');
          this.gradient.addColorStop(0.34, this.color);
          this.gradient.addColorStop(0.50, '#fff');
          this.gradient.addColorStop(0.67, this.color);
          this.gradient.addColorStop(0.84, '#fff');
          this.gradient.addColorStop(1., this.color);
          break;
      }
    },

    draw: function(ctx) {
      if(this.lives !== 0) {
        //ctx.drawImage(this.img, this.x, this.y);
        ctx.drawImage(this.img, this.x, this.y);

        // if(!this.gradient) {
        //   this.generateGradient(ctx);
        // }
        // ctx.fillStyle = this.gradient;
        // ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }

  },

  //=============================================================================
  // PADDLE
  //=============================================================================

  Paddle: {

    initialize: function(ark) {
      this.ark    = ark;
      this.width  = ark.cfg.paddleWidth;
      this.height = ark.cfg.paddleHeight;
      this.minX   = ark.cfg.wallWidth;
      this.maxX   = ark.width - ark.cfg.wallWidth - this.width;
      this.speed  = (this.maxX - this.minX) / ark.cfg.paddleSpeed;
      this.setpos(this.maxX / 2, ark.cfg.height - this.height - ark.cfg.bottomMargin);
      this.setdir(0);
    },

    setpos: function(x, y) {
      this.x      = x;
      this.y      = y;
      this.left   = this.x;
      this.right  = this.left + this.width;
      this.top    = this.y;
      this.bottom = this.y + this.height;
    },

    setdir: function(dx) {
      this.toleft   = (dx < 0 ? -dx : 0);
      this.toright  = (dx > 0 ?  dx : 0);
    },

    update: function(dt, ball) {
      var amount = this.toright - this.toleft;
      if (amount != 0) {
        var x = this.x + (amount * dt * this.speed);
        if (x < this.minX)
          x = this.minX;
        else if (x > this.maxX)
          x = this.maxX;
        this.setpos(x, this.y);
      }
    },

    draw: function(ctx) {
      ctx.fillStyle = Ark.Colors.walls;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    },

    moveLeft:        function(accel) { this.toleft   = 1 * (accel || 1); },
    moveRight:       function(accel) { this.toright  = 1 * (accel || 1); },
    stopMovingLeft:  function() {      this.toleft   = 0; },
    stopMovingRight: function() {      this.toright  = 0; }
  },

  //=============================================================================
  // BALL
  //=============================================================================

  Ball: {

    initialize: function(ark) {
      this.ark      = ark;
      this.radius   = ark.cfg.ballRadius;
      this.minX     = this.radius;
      this.maxX     = ark.width - this.radius;
      this.minY     = ark.cfg.wallWidth + this.radius;
      this.maxY     = ark.height - ark.cfg.wallWidth - this.radius;
      this.speed    = (this.maxY - this.minY) / ark.cfg.ballSpeed;
      this.maxSpeed = (this.maxY - this.minY) / ark.cfg.ballMaxSpeed;
      this.minSpeed = (this.maxY - this.minY) / ark.cfg.ballMinSpeed;
      this.accel    = ark.cfg.ballAccel;
      this.color    = Ark.Colors.ball;
      this.playing  = false;
    },

    reset: function() {
      this.playing = false;
      this.setPaddlesPos();
    },

    launch: function() {
      this.playing = true;
      //this.setdir(0, this.speed);
      this.setdir(Game.random(-this.speed, this.speed), this.speed);
    },

    setpos: function(x, y) {
      this.x      = x;
      this.y      = y;
      this.left   = this.x - this.radius;
      this.top    = this.y - this.radius;
      this.right  = this.x + this.radius;
      this.bottom = this.y + this.radius;
    },

    setPaddlesPos: function() {
      this.setpos(this.ark.paddle.x + (this.ark.paddle.width/2), this.maxY - ark.cfg.paddleHeight - ark.cfg.bottomMargin);
      this.setdir(0, 0);
    },

    setdir: function(dx, dy) {
      this.dx = dx;
      this.dy = dy;
    },

    update: function(dt, paddle, blocks) {
      if(this.playing) {
      pos = Ark.Helper.accelerate(this.x, this.y, this.dx, this.dy, this.accel, dt);

        if ((pos.dy > 0) && (pos.y > this.maxY)) {
          pos.y = this.maxY;
          pos.dy = -pos.dy;
        }
        else if ((pos.dy < 0) && (pos.y < this.minY)) {
          pos.y = this.minY;
          pos.dy = -pos.dy;
        }

        if ((pos.dx > 0) && (pos.x > this.maxX)) {
          pos.x = this.maxX;
          pos.dx = -pos.dx;
        }
        else if ((pos.dx < 0) && (pos.x < this.minX)) {
          pos.x = this.minX;
          pos.dx = -pos.dx;
        }

        var pt;
        for (var i = blocks.length - 1; i >= 0; i--) {
          pt = Ark.Helper.ballIntercept(this, blocks[i], pos.nx, pos.ny);
          if (pt) {
            blocks[i].hit();
            break;
          }
        };
        
        var paddleIntercept = false;
        if(!pt) {
          pt = Ark.Helper.ballIntercept(this, paddle, pos.nx, pos.ny);
          paddleIntercept = true;
        } else {
          this.ark.checkFinished();
        }

        if (pt) {
          switch(pt.d) {
            case 'left':
            case 'right':
              pos.x = pt.x;
              pos.dx = -pos.dx;
              break;
            case 'top':
            case 'bottom':
              pos.y = pt.y;
              pos.dy = -pos.dy;
              break;
          }

          if(paddleIntercept) {
            //TODO
            // add/remove spin based on paddle direction
            if (paddle.toleft) {
              pos.dx = pos.dx * (pos.dx < 0 ? 0.5 : 1.5);
              pos.dy = pos.dy * (pos.dy < 0 ? 0.5 : 1.5);
            }
            else if (paddle.toright) {
              pos.dx = pos.dx * (pos.dx > 0 ? 0.5 : 1.5);
              pos.dy = pos.dy * (pos.dy > 0 ? 0.5 : 1.5);
            }
          }
        }

        if(paddleIntercept) {
          this.accel += 0.1;
        } else {
          this.accel = 0;
        }

        var positiveDX = pos.dx/Math.abs(pos.dx) || 1,
          positiveDY = pos.dy/Math.abs(pos.dy) || 1;

        if(Math.abs(pos.dx) > this.maxSpeed) {
          pos.dx = this.maxSpeed * positiveDX;
        } else if(Math.abs(pos.dx) < this.minSpeed) {
          pos.dx = this.minSpeed * positiveDX;
        }

        if(Math.abs(pos.dy) > this.maxSpeed) {
          pos.dy = this.maxSpeed * positiveDY;
        } else if(Math.abs(pos.dy) < this.minSpeed) {
          pos.dy = this.minSpeed * positiveDY;
        }

        this.setpos(pos.x,  pos.y);
        this.setdir(pos.dx, pos.dy);
      } else {
        this.setPaddlesPos();
      }
    },

    draw: function(ctx) {
      var w = h = this.radius * 2;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, true);
      ctx.fill();
      ctx.closePath();
    }

  },

  //=============================================================================
  // HELPER
  //=============================================================================

  Helper: {

    accelerate: function(x, y, dx, dy, accel, dt) {
      var x2  = x + (dt * dx) + (accel * dt * dt * 0.5);
      var y2  = y + (dt * dy) + (accel * dt * dt * 0.5);
      var dx2 = dx + (accel * dt) * (dx > 0 ? 1 : -1);
      var dy2 = dy + (accel * dt) * (dy > 0 ? 1 : -1);
      return { nx: (x2-x), ny: (y2-y), x: x2, y: y2, dx: dx2, dy: dy2 };
    },

    intercept: function(x1, y1, x2, y2, x3, y3, x4, y4, d) {
      var denom = ((y4-y3) * (x2-x1)) - ((x4-x3) * (y2-y1));
      if (denom != 0) {
        var ua = (((x4-x3) * (y1-y3)) - ((y4-y3) * (x1-x3))) / denom;
        if ((ua >= 0) && (ua <= 1)) {
          var ub = (((x2-x1) * (y1-y3)) - ((y2-y1) * (x1-x3))) / denom;
          if ((ub >= 0) && (ub <= 1)) {
            var x = x1 + (ua * (x2-x1));
            var y = y1 + (ua * (y2-y1));
            return { x: x, y: y, d: d};
          }
        }
      }
      return null;
    },

    ballIntercept: function(ball, rect, nx, ny) {
      var pt;
      if (nx < 0) {
        pt = Ark.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny, 
                                   rect.right  + ball.radius, 
                                   rect.top    - ball.radius, 
                                   rect.right  + ball.radius, 
                                   rect.bottom + ball.radius, 
                                   "right");
      }
      else if (nx > 0) {
        pt = Ark.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny, 
                                   rect.left   - ball.radius, 
                                   rect.top    - ball.radius, 
                                   rect.left   - ball.radius, 
                                   rect.bottom + ball.radius,
                                   "left");
      }
      if (!pt) {
        if (ny < 0) {
          pt = Ark.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny, 
                                     rect.left   - ball.radius, 
                                     rect.bottom + ball.radius, 
                                     rect.right  + ball.radius, 
                                     rect.bottom + ball.radius,
                                     "bottom");
        }
        else if (ny > 0) {
          pt = Ark.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny, 
                                     rect.left   - ball.radius, 
                                     rect.top    - ball.radius, 
                                     rect.right  + ball.radius, 
                                     rect.top    - ball.radius,
                                     "top");
        }
      }
      return pt;
    }

  }
}; //Ark