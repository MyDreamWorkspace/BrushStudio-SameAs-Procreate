import './fabric.brushes.js'

export const shapes = [
	"images/shapes/Sauce-brush.jpg",
	"images/shapes/Fat-nozzle-brush.jpg",
	"images/shapes/Queens-brush.jpg",
	"images/shapes/fellas-brush.jpg",
	"images/shapes/Flaming-brush.jpg",
	"images/shapes/Handstyler-brush.jpg",
	"images/shapes/Rough-marker-brush.jpg",
	"images/shapes/Dope-round-brush.jpg",
	"images/shapes/Round-outliner-brush.jpg",
	"images/shapes/Grassy-brush.jpg",
	"images/shapes/Grunge-brush.jpg",
	"images/shapes/Pandini-brush.jpg",
	"images/shapes/Tulle-brush.jpg",
	"images/shapes/Ink17SparklingBlade2.jpg",
	"images/shapes/Ink39-brush.jpg",
	"images/shapes/Ink54WideAngleRish.jpg",
	"images/shapes/Water-color-brush.jpg",
	"images/shapes/Wet-acrylic.jpg",
	"images/shapes/Lightpen-brush.jpg",
	"images/shapes/3d-brush.jpg",
	"images/shapes/Nebula-brush.jpg",
	"images/shapes/Swordgrass-brush.jpg",
];

export const textures = [
	"images/textures/none.jpg",
	"images/textures/Sauce-grain.jpg",
	"images/textures/fat-nozzle-grain.jpg",
	"images/textures/Fellas-grain.jpg",
	"images/textures/flaming-marker-grain.jpg",
	"images/textures/rough-marker-grain.jpg",
	"images/textures/Grassy-grain.jpg",
	"images/textures/grunge-grain.jpg",
	"images/textures/Pandini-grain.jpg",
	"images/textures/Tulle-grain.jpg",
	"images/textures/Sparkling-blade-grain.jpg",
	"images/textures/Ink-drying-grain.jpg",
	"images/textures/Water-color.jpg",
	"images/textures/Wet-acrylic-grain.jpg",
	"images/textures/Swordgrass-grain.jpg",
];

export var bcolor = '#00963c';
export var scolor = '#ff69c3';
export var bwidth = 0.35;
export var bopacity = 1;

export const DatGui = (props, _fabricCanvas) => {
	let fabricCanvas = _fabricCanvas;
	let currentBrush = null;
	const gui = new dat.GUI({autoPlace:false});

	for (let p in props) {
		gui['brush'+p.charAt(0).toUpperCase() + p.slice(1)] = props[p];
	}

	var makeBrush = (brushName) => {
		localStorage.setItem("CurBrush", brushName);
		fabricCanvas.isDrawingMode = true;
		let brushOpts = JSON.parse(localStorage.getItem(brushName) || "{}");
		brushOpts.color = bcolor;
		brushOpts.scolor = scolor;
		brushOpts.width = bwidth;
		brushOpts.opacity = bopacity;
		brushOpts.brushCol = shapes[brushOpts.brushCol];
		brushOpts.patternCol = textures[brushOpts.patternCol];
		if (brushOpts.grainEffect == 2)
		{
			fabricCanvas.freeDrawingBrush.convertToImg();
		}
		fabricCanvas.freeDrawingBrush = new fabric['CustomBrush'](fabricCanvas, brushOpts);
		currentBrush = fabricCanvas.freeDrawingBrush;
	}

	function addButtons() {
		gui.clear = () => {
			fabricCanvas.clear();
			if (fabricCanvas.freeDrawingBrush.brush != undefined)
                fabricCanvas.freeDrawingBrush.brush.setClear();
		}
		gui.setting = () => {
			window.location.href = "/settings.html";
		}
		gui.save = () => {
			const a = document.createElement('a');
			a.download = 'sample.jpg';
			a.href = fabricCanvas.toDataURL();
			a.click();
		}
		gui.stopDraw = () => {
			currentBrush = fabricCanvas.freeDrawingBrush;
			fabricCanvas.isDrawingMode = false;
			fabricCanvas.freeDrawingBrush.convertToImg();
		}
		gui.startDraw = () => {
			fabricCanvas.freeDrawingBrush = currentBrush;
			fabricCanvas.isDrawingMode = true;
		}
		gui.EraseBrush = () => {
			fabricCanvas.freeDrawingBrush.convertToImg();

			fabricCanvas.isDrawingMode = true;
			var width = fabricCanvas.freeDrawingBrush.width * 200;
			fabricCanvas.freeDrawingBrush = new fabric.EraserBrush(fabricCanvas);
			fabricCanvas.freeDrawingBrush.width = width;
			currentBrush = fabricCanvas.freeDrawingBrush;
		}
		gui.UndoBrush = () => {
			fabricCanvas.freeDrawingBrush.convertToImg();
			
			fabricCanvas.isDrawingMode = true;
			var width = fabricCanvas.freeDrawingBrush.width * 200;
			fabricCanvas.freeDrawingBrush = new fabric.EraserBrush(fabricCanvas);
			fabricCanvas.freeDrawingBrush.width = width;
			fabricCanvas.freeDrawingBrush.inverted = true;
			currentBrush = fabricCanvas.freeDrawingBrush;
		}
		//Spray
		gui.QueensBrush = () => {makeBrush('QueensBrush')};
		gui.SauceBrush = () => {makeBrush('SauceBrush')};
		gui.FatNozzle = () => {makeBrush('FatNozzle')};
		gui.FellasBrush = () => {makeBrush('FellasBrush')};
		//Marker
		gui.FlamingMarker = () => {makeBrush('FlamingMarker')};
		gui.HandstylerOne = () => {makeBrush('HandstylerOne')};
		gui.RoughMarker = () => {makeBrush('RoughMarker')};
		gui.RoundDopeMarker = () => {makeBrush('RoundDopeMarker')};
		gui.RoundOutliner = () => {makeBrush('RoundOutliner')};
		// gui.RoundOutliner = () => {
		// 	fabricCanvas.isDrawingMode = true;
		// 	var oldColor = fabricCanvas.freeDrawingBrush.color;
		// 	fabricCanvas.freeDrawingBrush = new fabric['RoundOutliner'](fabricCanvas, {});
		// 	if(oldColor)	fabricCanvas.freeDrawingBrush.color = oldColor;
		// 	currentBrush = fabricCanvas.freeDrawingBrush;
		// }
		//Roller
		gui.Grassy = () => {makeBrush('Grassy')};
		gui.GrungyLinen = () => {makeBrush('GrungyLinen')};
		gui.Pandani = () => {makeBrush('Pandani')};
		gui.Tulle = () => {makeBrush('Tulle')};
		//Brush
		gui.Ink17SparklingBlade2 = () => {makeBrush('Ink17SparklingBlade2')};
		gui.Ink39DryingBright = () => {makeBrush('Ink39DryingBright')};
		gui.Ink54WideAngleRish = () => {makeBrush('Ink54WideAngleRish')};
		gui.Watercolor = () => {makeBrush('Watercolor')};
		gui.WetAcrylic = () => {makeBrush('WetAcrylic')};
		//Graffical
		gui.LightPen = () => {makeBrush('LightPen');}
		gui.ThreeDimBrush8 = () => {
			fabricCanvas.isDrawingMode = true;
			var oldColor = fabricCanvas.freeDrawingBrush.color;
			fabricCanvas.freeDrawingBrush = new fabric['ThreeDimBrush8'](fabricCanvas, {});
			if(oldColor)	fabricCanvas.freeDrawingBrush.color = oldColor;
			currentBrush = fabricCanvas.freeDrawingBrush;
		}
		gui.Nebula = () => {makeBrush('Nebula');}
		gui.Swordgrass = () => {makeBrush('Swordgrass')};

		gui.add(gui, 'stopDraw');
		gui.add(gui, 'startDraw');
		gui.add(gui, 'save');
		gui.add(gui, 'clear');
		gui.add(gui, 'setting');
		gui.add(gui, 'EraseBrush');
		gui.add(gui, 'UndoBrush');

		gui.add(gui, 'SauceBrush');
		gui.add(gui, 'FatNozzle');
		gui.add(gui, 'QueensBrush');
		gui.add(gui, 'FellasBrush');

		gui.add(gui, 'FlamingMarker');
		gui.add(gui, 'HandstylerOne');
		gui.add(gui, 'RoughMarker');
		gui.add(gui, 'RoundDopeMarker');
		gui.add(gui, 'RoundOutliner');

		gui.add(gui, 'Grassy');
		gui.add(gui, 'GrungyLinen');
		gui.add(gui, 'Pandani');
		gui.add(gui, 'Tulle');

		gui.add(gui, 'Ink17SparklingBlade2');
		gui.add(gui, 'Ink39DryingBright');
		gui.add(gui, 'Ink54WideAngleRish');
		gui.add(gui, 'Watercolor');
		gui.add(gui, 'WetAcrylic');

		gui.add(gui, 'LightPen');
		gui.add(gui, 'ThreeDimBrush8');
		gui.add(gui, 'Nebula');
		gui.add(gui, 'Swordgrass');
	}

	return {
		addButtons,
		getGui: () => {
			return gui;
		}
	}
};

export const getFabricCanvas = (canvasID, brushName, brushOpts) => {
	const fabricCanvas = new fabric.Canvas(canvasID, {
		isDrawingMode: true,
		// renderOnAddRemove: false,
		noScaleCache: false,
		cacheProperties: (
			'fill stroke strokeWidth strokeDashArray width height stroke strokeWidth strokeDashArray' +
			' strokeLineCap strokeLineJoin strokeMiterLimit fillRule backgroundColor'
		  ).split(' '),
		dirty: true,
		needsItsOwnCache: function() {
			return false;
		},
		perfLimitSizeTotal : 2097152,
		maxCacheSideLimit: 4096,
		minCacheSideLimit: 256,
	});
	if (canvasID == "canvas")
		fabricCanvas.setWidth(window.innerWidth).setHeight(window.innerHeight);
	if (canvasID == "previewer")
		fabricCanvas.setHeight($(".drawing-preview")[0].clientHeight).setWidth($(".drawing-preview")[0].clientWidth);

	fabric.util.enlivenObjects([{}, {}, {}], (objs) => {
		objs.forEach((item) => {
			fabricCanvas.add(item);
		});
		fabricCanvas.renderAll(); // Make sure to call once we're ready!
	});
	fabric.Object.prototype.objectCaching = true;
	fabricCanvas.freeDrawingBrush = new fabric[brushName](fabricCanvas, brushOpts || {});
	return fabricCanvas;
};

export const setBrushWidth = (val) => {
	bwidth = val;
};

export const setBrushColor = (val) => {
	bcolor = val;
};

export const setSecondaryColor = (val) => {
	scolor = val;
};

export const setBrushOpacity = (val) => {
	bopacity = val;
};