(function(scope) {
    function Hero() {
	this.scml = null;
	this.canvas = null;

	this.characterInfo = { x: 200.0, y: 50.0, angle: 0.0};
	this.src = '/example/content/PlatformerPack/playerWithGun.scon';
	this.assetPath = '/example/content/PlatformerPack/';

	this.init();
    }

    var p = Hero.prototype;

    p.init = function() {
	var queue = new createjs.LoadQueue(true);
	queue.on('fileload', p.jsonLoaded);
	queue.loadFile( {type:createjs.LoadQueue.JSON,
			 src:this.src,
	 		 data:this});
    };

    p.jsonLoaded = function( event) {  
	var self = event.item.data;
	self.scon = spriter_scon.loadFromScon( event.result, self.assetPath);
	self.canvas = document.getElementById('canvas');

	createjs.Ticker.addEventListener( 'tick', 
					  function(e) { self.handleTick(e); });
    };

    function toRad(n) {
        return n * Math.PI / 180;
    }

    p.handleTick = function( event) {
	var scon  = this.scon;
	var ctx   = this.canvas.getContext("2d");
	var cInfo = this.characterInfo;

	ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	ctx.save();
	ctx.translate( 0.0, this.canvas.height); // Bottom is now 0
	ctx.scale( 1.0, -1.0);                   // Up is now up

	if ( 1) { // draw debug axis
	    ctx.strokeStyle="#FF0000";
	    ctx.lineWidth = 2;

	    ctx.beginPath();
	    ctx.moveTo(-1000+cInfo.x,0+cInfo.y);
	    ctx.lineTo( 1000+cInfo.x,0+cInfo.y);
	    ctx.stroke();

	    ctx.beginPath();
	    ctx.moveTo(0+cInfo.x, 1000+cInfo.y);
	    ctx.lineTo(0+cInfo.x,-1000+cInfo.y);
	    ctx.stroke();

	    ctx.moveTo(0,0);
	}

	var entityId = scon.getEntityId('Player_With_gun');
	var animId   = scon.getAnimation(entityId, 'idle'); // 4000 frame long
	
	scon.setCurrentTime( event.time, {}, entityId, animId || 0,
	    function( obj) {
		var file = scon.folder[obj.folder].file[obj.file]; 
		var bitmap = file.easelBitmap;

		// May not have been loaded yet.
		if (bitmap) {
		    var width  = bitmap.image.width;
		    var height = bitmap.image.height;
		    
		    var pivot_x = 0 + (file.pivot_x || 0.0);
		    var pivot_y = 1 - (file.pivot_y || 0.0);

		    pivot_x *= width;
		    pivot_y *= height;

		    ctx.save();

                    ctx.translate( cInfo.x + obj.x, cInfo.y + obj.y);
                    ctx.rotate( toRad( obj.angle));
                    ctx.scale( obj.scale_x, obj.scale_y);
                    ctx.translate( -pivot_x, pivot_y);

                    ctx.scale( 1.0, -1.0);
                    ctx.drawImage( bitmap.image , 
				   0.0, 0.0, width, height,
				   0.0, 0.0, width, height);

		    ctx.restore();
		}
	    });

	ctx.restore();
    };

    scope.Hero = Hero;
})(window);

