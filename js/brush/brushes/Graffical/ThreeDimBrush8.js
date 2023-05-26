var myInterval = null;
var ThreeDimBrush8 = fabric.util.createClass(fabric.BaseBrush, {
	color: '#000',
	scolor: '#000',
	opacity: 0.6,
	width: 30,
	_baseWidth: 5,
	_latestStrokeLength: 0,
	_point: null,
	_size: 0,
	_latest: null,
	_drawn: false,
	_count: 0,
	_color: [0, 0, 0, 0],
	image: null,
	_lineWidth: 3,
	_imgload: false,
	range: 1,
	myInterval: null,
	ctx: null,
	refreshRate: 10,
	easing: 0.7,
	painters: [],
	strokes: 1,

	initialize: function(canvas, opt) {
		opt = opt || {};

		this.canvas = canvas;
		this.ctx = this.canvas.contextTop;
		this.ctx.willReadFrequently = true;
		this.width = opt.width || canvas.freeDrawingBrush.width;
		this.color = opt.color || canvas.freeDrawingBrush.color;
		this.scolor = opt.scolor || canvas.freeDrawingBrush.scolor;
		this.opacity = opt.opacity || canvas.contextTop.globalAlpha;
		this._point = new fabric.Point(0, 0);
		this.painters = [];
		this.convertToImg();
		for(var i = 0; i < this.strokes; i++) {
			var ease = this.easing;
			this.painters.push({
				dx : 0,
				dy : 0,
				ax : 0,
				ay : 0,
				div : 0.1,
				ease : ease
			});
		}
		var self = this;
		if (myInterval)
			clearInterval(myInterval);
		myInterval = setInterval(function() {
			self.draw();
		}, this.refreshRate);
	},

	setSize: function(val) {
		this.width = val;
	},

	set: function(p) {
		if (this._latest) {
			this._latest.setFromPoint(this._point);
		} else {
			this._latest = new fabric.Point(p.x, p.y);
		}
		fabric.Point.prototype.setFromPoint.call(this._point, p);
	},

	update: function(p) {
		this.set(p);
		this._latestStrokeLength = this._point.subtract(this._latest).distanceFrom({ x: 0, y: 0 });
	},

	distance: function(p1, p2) {
		return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
	},

	onMouseDown: function(pointer) {
		this.canvas.contextTop.globalAlpha = this.opacity;
		this.canvas.contextTop.lineWidth = this._lineWidth;
		this._size = this.width * 300 / 2 + this._baseWidth;
		this._drawn = true;
		this._count = 0;
		this._color = fabric.util.colorValues(this.color);
		this.set(pointer);
		for(var i = 0; i < this.painters.length; i++) {
			this.painters[i].dx = pointer.x;
			this.painters[i].dy = pointer.y;
		}
	},

	onMouseMove: function(pointer) {
		if (!this._drawn)
			return;
		this.update(pointer);
		this._count ++;
	},

	draw: function() {
        for(var i = 0; i < this.painters.length; i++) {
            var dx = this.painters[i].dx;
            var dy = this.painters[i].dy;
			var fromX = dx, fromY = dy;
            var dx1 = this.painters[i].ax = (this.painters[i].ax + (this.painters[i].dx - this._point.x) * this.painters[i].div) * this.painters[i].ease;
            this.painters[i].dx -= dx1;
            var dx2 = this.painters[i].dx;
            var dy1 = this.painters[i].ay = (this.painters[i].ay + (this.painters[i].dy - this._point.y) * this.painters[i].div) * this.painters[i].ease;
            this.painters[i].dy -= dy1;
            var dy2 = this.painters[i].dy;
			if (this._drawn)
			{
				var i, v, s, p, stepNum;
				var to = new fabric.Point(dx2, dy2), from = new fabric.Point(dx, dy);
				v = to.subtract(from); // vector from now point to last point
				//s is a foot width of two points.
				s = Math.ceil(this._size / 10);
				//calculate steps from foot width.
				stepNum = Math.floor(v.distanceFrom({ x: 0, y: 0 }) / s) + 1;
				v.normalize(s);
				var startAngle = 181;
				var endAngle = 300;
				var range = this._size / 2;
				this.ctx.save();
				this.ctx.lineCap = 'butt';
				this.ctx.lineJoin = 'round';
				var color = fabric.util.colorValues(this.color);
				var scolor = fabric.util.colorValues(this.scolor);
				this.ctx.globalAlpha = this.opacity;   
				for (var j = 0; j < stepNum; j ++) {
					p = from.add(v.multiply(j));
					this.ctx.globalCompositeOperation='destination-over';
					this.ctx.strokeStyle = 'rgba(255, 255, 255, 0)';
					this.ctx.fillStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (1) + ')';
					this.ctx.beginPath();
					this.ctx.arc(p.x, p.y, range, 0, 2 * Math.PI);
					this.ctx.fill();
				}

				this.ctx.globalCompositeOperation='source-over';
				for (i = startAngle; i < endAngle; i += 2)
				{
					var alpha = (Math.sqrt((endAngle - i) / (endAngle - startAngle)));
					if (i <= startAngle + 40)
						alpha = Math.min(alpha, (i - startAngle) * 0.02);
					this.ctx.strokeStyle = 'rgba(' + scolor[0] + ',' + scolor[1] + ',' + scolor[2] + ',' + (alpha) + ')';
					this.ctx.beginPath();
					this.ctx.lineWidth = 10;
					this.ctx.moveTo(from.x + range * Math.cos(i * Math.PI / 180), from.y + range * Math.sin(i * Math.PI / 180));
					this.ctx.lineTo(to.x + range * Math.cos(i * Math.PI / 180), to.y + range * Math.sin(i * Math.PI / 180));
					this.ctx.stroke();
				}
				// Add three color stops
				this.ctx.restore();
			}
        }
	},

	onMouseUp: function() {
		if (this._drawn) {
			try
			{
				// this.convertToImg();
			}
			catch(e)
			{
				console.log(e);
			}
		}
		this._drawn = false;
		this._latest = null;
		this._latestStrokeLength = 0;
	},

	_render: function() {}

}); // End ThreeDimBrush8

export default ThreeDimBrush8;