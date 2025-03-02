/*
TODO
- reset renderer function
- react to changes in: drawings, palettes
- possible future plan: limit size of cache (remove old images)
- change image store path from (pal > col > draw) to (draw > pal > col)
- get rid of old getSpriteImage (etc) methods
- get editor working again [in progress]
- move debug timer class into core (seems useful)
*/

function Renderer(tilesize, scale) {

console.debug("!!!!! NEW RENDERER");

var imageStore = { // TODO : rename to imageCache
	source: {},
	render: {}
};

var palettes = null; // TODO : need null checks?
var context = null;

function setPalettes(paletteObj) {
	palettes = paletteObj;

	// TODO : should this really clear out the render cache?
	imageStore.render = {};
}

function getPaletteColor(paletteId, colorIndex) {
	if (palettes[paletteId] === undefined) {
		paletteId = "default";
	}

	var palette = palettes[paletteId];

	if (colorIndex > palette.colors.length) { // do I need this failure case? (seems un-reliable)
		colorIndex = 0;
	}

	var color = palette.colors[colorIndex];

	return {
		r : color[0],
		g : color[1],
		b : color[2]
	};
}

var debugRenderCount = 0;

// TODO : change image store path from (pal > col > draw) to (draw > pal > col)
function renderImage(drawing, paletteId) {
	// debugRenderCount++;
	// console.debug("RENDER COUNT " + debugRenderCount);

	var col = drawing.col;
	var colStr = "" + col;
	var pal = paletteId;
	var drwId = drawing.drw;
	var imgSrc = imageStore.source[ drawing.drw ];

	// initialize render cache entry
	if (imageStore.render[drwId] === undefined || imageStore.render[drwId] === null) {
		imageStore.render[drwId] = {};
	}

	if (imageStore.render[drwId][pal] === undefined || imageStore.render[drwId][pal] === null) {
		imageStore.render[drwId][pal] = {};
	}

	// create array of ImageData frames
	imageStore.render[drwId][pal][colStr] = [];

	for (var i = 0; i < imgSrc.length; i++) {
		var frameSrc = imgSrc[i];
		var frameData = imageDataFromImageSource( frameSrc, pal, col );
		imageStore.render[drwId][pal][colStr].push(frameData);
	}
}

function imageDataFromImageSource(imageSource, pal, col) {
	//console.debug(imageSource);
    var tilesize = imageSource.length;
    var scale = Math.ceil(4 / (tilesize / 8));

	var img = context.createImageData(tilesize*scale,tilesize*scale);

    var foregroundColor = { r:255, g:255, b:255};
    if (!isNaN(parseInt(col))) {
        foregroundColor = getPaletteColor(pal, col);
    } else if (typeof col == 'string' && col != 'NaN') {
        foregroundColor = hexToRgb(col);
    }
        
    //take 2 on grabbing an array of the palette

    if (palettes[pal] === undefined) {
        pal = "default";
    }
    var colors = palettes[pal].colors;

	for (var y = 0; y < tilesize; y++) {
		for (var x = 0; x < tilesize; x++) {
			var px = imageSource[y][x];
			for (var sy = 0; sy < scale; sy++) {
				for (var sx = 0; sx < scale; sx++) {
					var pxl = (((y * scale) + sy) * tilesize * scale * 4) + (((x*scale) + sx) * 4);
                    if (px == 1) {
                        img.data[pxl + 0] = foregroundColor.r;
                        img.data[pxl + 1] = foregroundColor.g;
                        img.data[pxl + 2] = foregroundColor.b;
                        img.data[pxl + 3] = 255;
                    }
                    else { //ch === 0
                        if (px == undefined || px >= colors.length || isNaN(parseInt(px))) {
                            console.debug('passed index out of palette range: ' + px);
                            px = 0;
                        }

						if (px > 0) { // treat background color as transparent
							img.data[pxl + 0] = colors[px][0];//r
							img.data[pxl + 1] = colors[px][1];//g
							img.data[pxl + 2] = colors[px][2];//b
							img.data[pxl + 3] = 255;
						}

                    }
				}
			}
		}
	}

	// convert to canvas: chrome has poor performance when working directly with image data
	var imageCanvas = document.createElement("canvas");
	imageCanvas.width = img.width;
	imageCanvas.height = img.height;
	var imageContext = imageCanvas.getContext("2d");
	imageContext.putImageData(img,0,0);

	return imageCanvas;
}

// TODO : move into core
function undefinedOrNull(x) {
	return x === undefined || x === null;
}

function isImageRendered(drawing, paletteId) {
	var col = drawing.col;
	var colStr = "" + col;
	var pal = paletteId;
	var drwId = drawing.drw;

	if (undefinedOrNull(imageStore.render[drwId]) ||
		undefinedOrNull(imageStore.render[drwId][pal]) ||
		undefinedOrNull(imageStore.render[drwId][pal][colStr])) {
			return false;
	}
	else {
		return true;
	}
}

function getImageSet(drawing, paletteId) {
	return imageStore.render[drawing.drw][paletteId][drawing.col];
}

function getImageFrame(drawing, paletteId, frameOverride) {
	var frameIndex = 0;
	if (drawing.animation.isAnimated) {
		if (frameOverride != undefined && frameOverride != null) {
			frameIndex = frameOverride;
		}
		else {
			frameIndex = drawing.animation.frameIndex;
		}
	}

	return getImageSet(drawing, paletteId)[frameIndex];
}

function getOrRenderImage(drawing, paletteId, frameOverride) {
	if (!isImageRendered(drawing, paletteId)) {
		renderImage(drawing, paletteId);
	}

	return getImageFrame(drawing, paletteId, frameOverride);
}

/* PUBLIC INTERFACE */
this.GetImage = getOrRenderImage;

this.SetPalettes = setPalettes;

this.SetImageSource = function(drawingId, imageSourceData) {
	imageStore.source[drawingId] = imageSourceData;
	imageStore.render[drawingId] = {}; // reset render cache for this image
}

this.GetImageSource = function(drawingId) {
	return imageStore.source[drawingId];
}

this.GetFrameCount = function(drawingId) {
	return imageStore.source[drawingId].length;
}

this.AttachContext = function(ctx) {
	context = ctx;
}

} // Renderer()