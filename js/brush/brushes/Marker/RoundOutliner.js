var myInterval = null;
var RoundOutliner = fabric.util.createClass(fabric.BaseBrush, {
	color: '#000',
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
	range: 1,
	myInterval: null,
	ctx: null,
	refreshRate: 10,
	easing: 0.6,
	painters: [],
	strokes: 1,
	path: null,
	strokePath: null,

	initialize: function(canvas, opt) {
		opt = opt || {};
		this.canvas = canvas;
		this.ctx = this.canvas.contextTop;
		this.width = opt.width || canvas.freeDrawingBrush.width;
		this.color = opt.color || canvas.freeDrawingBrush.color;
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
		this.ctx.globalAlpha = this.opacity;
		this._size = this.width * 300 / 2 + this._baseWidth;
		this._drawn = true;
		this._count = 0;
		this._color = fabric.util.colorValues(this.color);
		this.set(pointer);

		for(var i = 0; i < this.painters.length; i++) {
			this.painters[i].dx = pointer.x;
			this.painters[i].dy = pointer.y;
		}
		// this.ctx.filter = 'blur(2px)';
		this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";
		this.ctx.save();
		this.path = new Path2D();
		this.path.moveTo(pointer.x, pointer.y);
		this.strokePath = new Path2D();
		this.strokePath.moveTo(pointer.x, pointer.y);
	},

	onMouseMove: function(pointer) {
		if (!this._drawn)
			return;
		// if (this.distance(this._latest, pointer) < this._size / 2)
		// {
		// 	return;
		// }
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
				this.ctx.save();
				// this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				this.ctx.lineWidth = this._size * 2;
				this.ctx.strokeStyle = 'rgba(' + this._color[0] + ',' + this._color[1] + ',' + this._color[2] + ',' + (1) + ')';
				this.ctx.globalCompositeOperation = 'destination-over';
				this.strokePath.lineTo(dx2, dy2);
				this.ctx.stroke(this.strokePath);
				
				this.ctx.lineWidth = this._size;
				this.ctx.strokeStyle = 'rgba(' + (255-this._color[0]) + ',' + (255-this._color[1]) + ',' + (255-this._color[2]) + ',' + (1) + ')';
				this.ctx.globalCompositeOperation = 'source-over';
				this.path.lineTo(dx2, dy2);
				this.ctx.stroke(this.path);
				this.ctx.restore();
			}
        }
	},

	onMouseUp: function() {
		if (this._drawn) {
			this.convertToImg();
		}
		this._drawn = false;
		this._latest = null;
		this._latestStrokeLength = 0;
	},

	_render: function() {}

}); // End RoundOutliner

export default RoundOutliner;