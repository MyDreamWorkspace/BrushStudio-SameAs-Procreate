import RoundOutliner 		from 	'./brushes/Marker/RoundOutliner.js'
import ThreeDimBrush8 		from 	'./brushes/Graffical/ThreeDimBrush8.js'
import CustomBrush from './custombrush.js'

(function(fabric) {
fabric.util.trimCanvas = function(canvas) {
	var ctx = canvas.getContext('2d', {"willReadFrequently": true}),
		w = canvas.width,
		h = canvas.height,
		pix = {x:[], y:[]}, n,
		imageData = ctx.getImageData(0,0,w,h),
		fn = function(a,b) { return a-b };

	for (var y = 0; y < h; y++) {
		for (var x = 0; x < w; x++) {
			if (imageData.data[((y * w + x) * 4)+3] > 0) {
				pix.x.push(x);
				pix.y.push(y);
			}
		}
	}
	pix.x.sort(fn);
	pix.y.sort(fn);
	n = pix.x.length-1;

	//if (n == -1) {
	//	// Nothing to trim... empty canvas?
	//}

	w = pix.x[n] - pix.x[0];
	h = pix.y[n] - pix.y[0];
	var cut = ctx.getImageData(pix.x[0], pix.y[0], w, h);

	canvas.width = w;
	canvas.height = h;
	ctx.putImageData(cut, 0, 0);

	return {x:pix.x[0], y:pix.y[0]};
}

/**
 * Extract r,g,b,a components from any valid color.
 * Returns {undefined} when color cannot be parsed.
 *
 * @param {number} color Any color string (named, hex, rgb, rgba)
 * @returns {(Array|undefined)} Example: [0,128,255,1]
 * @see https://gist.github.com/oriadam/396a4beaaad465ca921618f2f2444d49
 */
fabric.util.colorValues = function(color) {
	if (!color) { return; }
	if (color.toLowerCase() === 'transparent') { return [0, 0, 0, 0]; }
	if (color[0] === '#') {
		if (color.length < 7) {
			// convert #RGB and #RGBA to #RRGGBB and #RRGGBBAA
			color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] + (color.length > 4 ? color[4] + color[4] : ''); 
		}
		return [parseInt(color.substr(1, 2), 16),
			parseInt(color.substr(3, 2), 16),
			parseInt(color.substr(5, 2), 16),
			color.length > 7 ? parseInt(color.substr(7, 2), 16)/255 : 1];
	}
	if (color.indexOf('rgb') === -1) {
		// convert named colors
		var tempElem = document.body.appendChild(document.createElement('fictum')); // intentionally use unknown tag to lower chances of css rule override with !important
		var flag = 'rgb(1, 2, 3)'; // this flag tested on chrome 59, ff 53, ie9, ie10, ie11, edge 14
		tempElem.style.color = flag;
		if (tempElem.style.color !== flag) {
			return; // color set failed - some monstrous css rule is probably taking over the color of our object
		}
		tempElem.style.color = color;
		if (tempElem.style.color === flag || tempElem.style.color === '') {
			return; // color parse failed
		}
		color = getComputedStyle(tempElem).color;
		document.body.removeChild(tempElem);
	}
	if (color.indexOf('rgb') === 0)	{
		if (color.indexOf('rgba') === -1) {
			color += ',1'; // convert 'rgb(R,G,B)' to 'rgb(R,G,B)A' which looks awful but will pass the regxep below
		}
		return color.match(/[\.\d]+/g).map(function(a)	{
			return +a
		});
	}
}

fabric.Point.prototype.angleBetween = function(that) {
	return Math.atan2( this.x - that.x, this.y - that.y);
};

fabric.Point.prototype.normalize = function(thickness) {
	if (null === thickness || undefined === thickness) {
		thickness = 1;
	}

	var length = this.distanceFrom({ x: 0, y: 0 });

	if (length > 0) {
		this.x = this.x / length * thickness;
		this.y = this.y / length * thickness;
	}

	return this;
};

/**
 * Convert a brush drawing on the upperCanvas to an image on the fabric canvas.
 * This makes the drawing editable, it can be moved, rotated, scaled, skewed etc.
 */
fabric.BaseBrush.prototype.convertToImg = function() {
	try
	{
		var pixelRatio = this.canvas.getRetinaScaling(),
		c = fabric.util.copyCanvasElement(this.canvas.upperCanvasEl),
		xy = fabric.util.trimCanvas(c),
		img = new fabric.Image(c);
		this.canvas.add(img);
		img.set({left:xy.x/pixelRatio,top:xy.y/pixelRatio,'scaleX':1/pixelRatio,'scaleY':1/pixelRatio}).setCoords();
		this.canvas.clearContext(this.canvas.contextTop);
	}
	catch(e)
	{
		
	}
}

fabric.util.getRandom = function(max, min) {
	min = min ? min : 0;
	return Math.random() * ((max ? max : 1) - min) + min;
};  


fabric.util.clamp = function (n, max, min) {
	if (typeof min !== 'number') { min = 0; }
	return n > max ? max : n < min ? min : n;
};

fabric.Stroke = fabric.util.createClass(fabric.Object,{
	color: null,
	inkAmount: null,
	lineWidth: null,

	_point: null,
	_lastPoint: null,
	_currentLineWidth: null,

	initialize: function(ctx, pointer, range, color, lineWidth, inkAmount) {
		var rx = fabric.util.getRandom(range),
			c = fabric.util.getRandom(Math.PI * 2),
			c0 = fabric.util.getRandom(Math.PI * 2),
			x0 = rx * Math.sin(c0),
			y0 = rx / 2 * Math.cos(c0),
			cos = Math.cos(c),
			sin = Math.sin(c);

		this.ctx = ctx;
		this.color = color;
		this._point = new fabric.Point(pointer.x + x0 * cos - y0 * sin, pointer.y + x0 * sin + y0 * cos);
		this.lineWidth = lineWidth;
		this.inkAmount = inkAmount;
		this._currentLineWidth = lineWidth;

		ctx.lineCap = 'round';
	},

	update: function(pointer, subtractPoint, distance) {
		this._lastPoint = fabric.util.object.clone(this._point);
		this._point = this._point.addEquals({ x: subtractPoint.x, y: subtractPoint.y });

		var n = this.inkAmount / (distance + 1),
			per = (n > 0.3 ? 0.2 : n < 0 ? 0 : n);
		this._currentLineWidth = this.lineWidth * per;
	},

	draw: function() {
		var ctx = this.ctx;
		ctx.save();
		this.line(ctx, this._lastPoint, this._point, this.color, this._currentLineWidth);
		ctx.restore();
	},

	line: function(ctx, point1, point2, color, lineWidth) {
		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;
		ctx.beginPath();
		ctx.moveTo(point1.x, point1.y);
		ctx.lineTo(point2.x, point2.y);
		ctx.stroke();
	}
});

fabric.RoundOutliner = RoundOutliner;
fabric.ThreeDimBrush8 = ThreeDimBrush8;
fabric.CustomBrush = CustomBrush;

})(typeof fabric !== 'undefined' ? fabric : require('fabric').fabric);
