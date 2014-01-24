// Implementation of http://www.brashmonkey.com/ScmlDocs/ScmlReference.html
//
// Works with JSON loaded from SCON file
(function() {
    var Epslion = 0.000001;

    function toRad(n) {
        return n * Math.PI / 180;
    }

    var asArray = function(e) {
        return (e instanceof Array) ? e : [e];
    };

    var lerp = function( a, b, t) {
        return ((b-a) * t) + a;
    };

    var angleDiff = function( a, b) {
        var d = Math.abs(a - b);
        return Math.abs( ((d + 180) % 360) - 180);
    };

    var angleLerp = function( a, b, t, spin) {
        if(spin===0)
        {
            return a;
        }
        var diff = angleDiff(a, b);
        
        // b clockwise from a
        if (spin>=0)
        {
            return (a + diff * t);
        }
        // b anticlockwise from a
        else 
        {
            return (a - diff * t);
        }
    };

    // Find the animations main key that bounds this time
    var mainlineKeyFromTime = function( a, t) {
        var k = null;
        a.mainline.key.every( function( elem, i, array) {
	    var kTime = elem.time || 0.0;
            if (kTime <= t) {
                k = elem;
            } else if (kTime >= t) {
                return false;
            }
            return true;
        });
        return k;
    };

    var keyFromRef = function( anim, ref) {
        var tl = anim.timeline[ref.timeline];
        var ka = tl.key[ref.key];

        if ( tl.key.length === 1) {
            return {a:ka,b:ka,bTime:ka.time};
        }

        var kbIndex = ref.key + 1;

        if ( kbIndex >= tl.key.length) {
            if ( anim.looping !== 'false') {
                kbIndex = 0;
            } else {
                return {a:ka,b:ka,bTime:ka.time};
            }
        }

        var kb = tl.key[kbIndex];
        var kbTime = kb.time || 0.0;

        if ( kbTime < ka.time) {
	    kbTime = anim.length;
        }

        return {a:ka,b:kb,bTime:kbTime};
    };

    var getTBetweenKeys = function( a, b, nextTime, currentTime) {
	var aTime = a.time || 0.0;
        var curveType = a.curve_type || 'linear';
        if (curveType === 'instant' || aTime === nextTime) {
            return 0;
        }
        var bTime = nextTime || aTime+1.0;
        var t = (currentTime - aTime) / (bTime - aTime);
        return t;
    };

    var unmapFromParent = function( pos, parent) {
	var pScaleX = parent.scale_x || 1.0;
	var pScaleY = parent.scale_y || 1.0;
	var pAngle  = parent.angle || 0.0;

	var preMultX = pos.x * pScaleX;
        var preMultY = pos.y * pScaleY;

        var sin = Math.sin( toRad( pAngle));
        var cos = Math.cos( toRad( pAngle));

        var x = ((preMultX * cos) - (preMultY * sin)) + (parent.x || 0.0);
        var y = ((preMultX * sin) + (preMultY * cos)) + (parent.y || 0.0);

	var s = {x       : x, 
		 y       : y,
		 angle   : pos.angle + pAngle,
		 scale_x : pos.scale_x * pScaleX,
		 scale_y : pos.scale_y * pScaleY,
		 pos     : pos.a * (parent.a || 1.0),
                 file    : pos.file,
                 folder  : pos.folder};

	return s;
    };

    var tween = function( a, b, t) {
	var ao = a.object || a.bone;
	var bo = b.object || b.bone;
        return { x       : lerp( ao.x || 0.0, bo.x || 0.0, t),
                 y       : lerp( ao.y || 0.0, bo.y || 0.0, t),
                 angle   : angleLerp( ao.angle || 0.0, bo.angle || 0.0, t, a.spin || 1),
                 a       : lerp( ao.a || 1.0, bo.a || 1.0, t),
                 scale_x : lerp( ao.scale_x || 1.0, bo.scale_x || 1.0, t),
                 scale_y : lerp( ao.scale_y || 1.0, bo.scale_y || 1.0, t),
                 pivot_x : lerp( ao.pivot_x || 0.0, bo.pivot_x || 0.0, t),
                 pivot_y : lerp( ao.pivot_y || 0.0, bo.pivot_y || 0.0, t),
                 file    : ao.file,
                 folder  : ao.folder};
    };

    var updateCharacter = function( anim, keys, time, root){
        var transformedBones = [];
        keys.bone_ref.forEach( function(elem) {
            var parent = (elem.parent !== undefined && elem.parent >= 0)
                    ? transformedBones[elem.parent]
                    : root;
            var interp = keyFromRef( anim, elem);
            var interpT = getTBetweenKeys( interp.a, interp.b, interp.bTime, time);
            var tweened = tween( interp.a, interp.b, interpT);
	    var transformed = unmapFromParent( tweened, parent);
	    transformedBones.push( transformed);
        });

        var transformedObjs = [];
        keys.object_ref.forEach( function(elem) {
            var parent = (elem.parent !== undefined && elem.parent >= 0)
                    ? transformedBones[elem.parent]
                    : root;
            var interp = keyFromRef( anim, elem);
            var interpT = getTBetweenKeys( interp.a, interp.b, interp.bTime, time);
            var tweened = tween( interp.a, interp.b, interpT);
	    var transformed = unmapFromParent( tweened, parent);
	    transformed.name = anim.timeline[elem.timeline].name;
	    transformedObjs.push( transformed);
        });

	return transformedObjs;
    };

    var setCurrentTime = function(t, characterInfo, currentEntity, currentAnim, paintFunc) {
        var e = this.entity[currentEntity || 0];
        var anim = e.animation[currentAnim || 0];

        var newTime = (anim.looping !== 'false')
                ? t % anim.length
                : Math.min( t, anim.length);

        var key  = mainlineKeyFromTime( anim, newTime);
        var objs = updateCharacter( anim, key, newTime, characterInfo);
	objs.forEach( paintFunc);
    };

    var getEntityId = function(entityName) {
	for ( var i = 0, l = this.entity.length;
	      i < l;
	      i++ ) {
		  if ( this.entity[i].name === entityName) {
		      return i;
		  }
	      }
	return 0;
    };

    var getAnimationId = function(currentEntity, animName) {
        var e = this.entity[currentEntity];
	for ( var i = 0, l = e.animation.length;
	      i < l;
	      i++ ) {
		  if ( e.animation[i].name === animName) {
		      return i;
		  }
	      }
	return 0;
    };

    var Scon = function(entity,folder) {
	this.entity = entity;
	this.folder = folder;
    };

    Scon.prototype.getEntityId = getEntityId;
    Scon.prototype.getAnimationId = getAnimationId;
    Scon.prototype.setCurrentTime = setCurrentTime;
    Scon.prototype.constructor = Scon;

    var loadFromScon = function(json,prefix) {
	var data = new Scon( json.entity, 
			     json.folder);

        var manifest = [];
        asArray(data.folder).forEach( function(folder) {
            asArray(folder.file).forEach( function(file) {
                // Tell the loader about this
                manifest.push( {src:file.name, 
                                type:createjs.LoadQueue.IMAGE, 
                                data:file} );
            });
        });

        var queue = new createjs.LoadQueue(true, prefix);
        var fileload = function( result) {  
            var img  = result.item;
            var file = img.data;
            file.easelBitmap = new createjs.Bitmap( result.result);
        };
        queue.on('fileload', fileload, this);
        queue.loadManifest( manifest);

        return data;
    };

    window.spriter_scon = {
        loadFromScon : loadFromScon
    };
})();
