// import { fabric } from "./fabric";
const USE_BLEND_MODE = false;
const USE_ROUNDOUTLINER = false;
const ROUNDOUTLINER_STROKE = 1;
const USE_3D = true;
function Croquis(mainCanvas, opts, convertToImg, imageDataList, properties) {
    var self = this;
    if (properties != null)
        for (var property in properties)
            self[property] = properties[property];
    var domElement = mainCanvas;
    var myContext = mainCanvas.contextTop;
    self.getDOMElement = function () {
        return domElement;
    };
    self.setDomElement = function(element) {
        domElement = element;
        domElement.style.clear = 'both';
        domElement.style.setProperty('user-select', 'none');
        domElement.style.setProperty('-webkit-user-select', 'none');
        domElement.style.setProperty('-ms-user-select', 'none');
        domElement.style.setProperty('-moz-user-select', 'none');
    };
    self.getRelativePosition = function (absoluteX, absoluteY) {
        var rect = domElement.getBoundingClientRect();
        return {x: absoluteX - rect.left,y: absoluteY - rect.top};
    };
    var eventListeners = {
        'ondown': [],
        'onmove': [],
        'onup': [],
        'ontick': [],
        'onchange': [],
        'onlayeradd': [],
        'onlayerremove': [],
        'onlayerswap': [],
        'onlayerselect': []
    };
    function dispatchEvent(event, e) {
        event = event.toLowerCase();
        e = e || {};
        if (eventListeners.hasOwnProperty(event)) {
            eventListeners[event].forEach(function (listener) {
                listener.call(self, e);
            });
        }
        else throw 'don\'t support ' + event;
    }
    self.addEventListener = function (event, listener) {
        event = event.toLowerCase();
        if (eventListeners.hasOwnProperty(event)) {
            if (typeof listener !== 'function')
                throw listener + ' is not a function';
            eventListeners[event].push(listener);
        }
        else throw 'don\'t support ' + event;
    };
    self.removeEventListener = function (event, listener) {
        event = event.toLowerCase();
        if (eventListeners.hasOwnProperty(event)) {
            if (listener == null) { // remove all
                eventListeners[event] = [];
                return;
            }
            var listeners = eventListeners[event];
            var index = listeners.indexOf(listener);
            if (index >= 0) listeners.splice(index, 1);
        }
        else throw 'don\'t support ' + event;
    };
    self.hasEventListener = function (event, listener) {
        event = event.toLowerCase();
        if (eventListeners.hasOwnProperty(event)) {
            if (listener == null)
                return eventListeners[event].length > 0;
            return eventListeners[event].indexOf(listener) >= 0;
        }
        else return false;
    };
    var undoStack = [];
    var redoStack = [];
    var undoLimit = 10;
    var preventPushUndo = false;
    var pushToTransaction = false;
    self.getUndoLimit = function () {
        return undoLimit;
    };
    self.setUndoLimit = function (limit) {
        undoLimit = limit;
    };
    self.lockHistory = function () {
        preventPushUndo = true;
    };
    self.unlockHistory = function () {
        preventPushUndo = false;
    };
    self.beginHistoryTransaction = function () {
        undoStack.push([]);
        pushToTransaction = true;
    };
    self.endHistoryTransaction = function () {
        pushToTransaction = false;
    };
    self.clearHistory = function () {
        if (preventPushUndo)
            throw 'history is locked';
        undoStack = [];
        redoStack = [];
    };
    function pushUndo(undoFunction) {
        dispatchEvent('onchange');
        if (self.onChanged)
            self.onChanged();
        if (preventPushUndo)
            return;
        redoStack = [];
        if (pushToTransaction)
            undoStack[undoStack.length - 1].push(undoFunction);
        else
            undoStack.push([undoFunction]);
        while (undoStack.length > undoLimit)
            undoStack.shift();
    }
    self.undo = function () {
        if (pushToTransaction)
            throw 'transaction is not ended';
        if (preventPushUndo)
            throw 'history is locked';
        if (isDrawing || isStabilizing)
            throw 'still drawing';
        if (undoStack.length == 0)
            throw 'no more undo data';
        var undoTransaction = undoStack.pop();
        var redoTransaction = [];
        while (undoTransaction.length)
            redoTransaction.push(undoTransaction.pop()());
        redoStack.push(redoTransaction);
    };
    self.redo = function () {
        if (pushToTransaction)
            throw 'transaction is not ended';
        if (preventPushUndo)
            throw 'history is locked';
        if (isDrawing || isStabilizing)
            throw 'still drawing';
        if (redoStack.length == 0)
            throw 'no more redo data';
        var redoTransaction = redoStack.pop();
        var undoTransaction = [];
        while (redoTransaction.length)
            undoTransaction.push(redoTransaction.pop()());
        undoStack.push(undoTransaction);
    };
    function pushLayerOpacityUndo(index) {
        index = (index == null) ? layerIndex : index;
        var snapshotOpacity = self.getLayerOpacity(index);
        var swap = function () {
            self.lockHistory();
            var temp = self.getLayerOpacity(index);
            self.setLayerOpacity(snapshotOpacity, index);
            snapshotOpacity = temp;
            self.unlockHistory();
            return swap;
        }
        pushUndo(swap);
    }
    function pushLayerVisibleUndo(index) {
        index = (index == null) ? layerIndex : index;
        var snapshotVisible = self.getLayerVisible(index);
        var swap = function () {
            self.lockHistory();
            var temp = self.getLayerVisible(index);
            self.setLayerVisible(snapshotVisible, index);
            snapshotVisible = temp;
            self.unlockHistory();
            return swap;
        }
        pushUndo(swap);
    }
    function pushSwapLayerUndo(layerA, layerB) {
        var swap = function () {
            self.lockHistory();
            self.swapLayer(layerA, layerB);
            self.unlockHistory();
            return swap;
        }
        pushUndo(swap);
    }
    function pushAddLayerUndo(index) {
        var add = function () {
            self.lockHistory();
            self.addLayer(index);
            self.unlockHistory();
            return remove;
        }
        var remove = function () {
            self.lockHistory();
            self.removeLayer(index);
            self.unlockHistory();
            return add;
        }
        pushUndo(remove);
    }
    function pushRemoveLayerUndo(index) {
        var layerContext = getLayerContext(index);
        var w = size.width;
        var h = size.height;
        var snapshotData = layerContext.getImageData(0, 0, w, h);
        var add = function () {
            self.lockHistory();
            self.addLayer(index);
            var layerContext = getLayerContext(index);
            layerContext.putImageData(snapshotData, 0, 0);
            self.unlockHistory();
            return remove;
        }
        var remove = function () {
            self.lockHistory();
            self.removeLayer(index);
            self.unlockHistory();
            return add;
        }
        pushUndo(add);
    }
    function pushDirtyRectUndo(x, y, width, height, index) {
        index = (index == null) ? layerIndex : index;
        var w = size.width;
        var h = size.height;
        var right = x + width;
        var bottom = y + height;
        x = Math.min(w, Math.max(0, x));
        y = Math.min(h, Math.max(0, y));
        width = Math.min(w, Math.max(x, right)) - x;
        height = Math.min(h, Math.max(y, bottom)) - y;
        if ((x % 1) > 0)
            ++width;
        if ((y % 1) > 0)
            ++height;
        x = x | 0;
        y = y | 0;
        width = Math.min(w - x, Math.ceil(width));
        height = Math.min(h - y, Math.ceil(height));
        if ((width == 0) || (height == 0)) {
            var doNothing = function () {
                return doNothing;
            }
            pushUndo(doNothing);
        }
        else {
            var layerContext = getLayerContext(index);
            var snapshotData = layerContext.getImageData(x, y, width, height);
            var swap = function () {
                var layerContext = getLayerContext(index);
                var tempData = layerContext.getImageData(x, y, width, height);
                layerContext.putImageData(snapshotData, x, y);
                snapshotData = tempData;
                return swap;
            }
            pushUndo(swap);
        }
        if (renderDirtyRect)
            drawDirtyRect(x, y, width, height);
    }
    function pushContextUndo(index) {
        index = (index == null) ? layerIndex : index;
        pushDirtyRectUndo(0, 0, size.width, size.height, index);
    }
    function pushAllContextUndo() {
        var snapshotDatas = [];
        var i;
        var w = size.width;
        var h = size.height;
        for (i = 0; i < layers.length; ++i) {
            var layerContext = getLayerContext(i);
            snapshotDatas.push(layerContext.getImageData(0, 0, w, h));
        }
        var swap = function (index) {
            var layerContext = getLayerContext(index);
            var tempData = layerContext.getImageData(0, 0, w, h);
            layerContext.putImageData(snapshotDatas[index], 0, 0);
            snapshotDatas[index] = tempData;
        }
        var swapAll = function () {
            for (var i = 0; i < layers.length; ++i)
                swap(i);
            return swapAll;
        }
        pushUndo(swapAll);
    }
    function pushCanvasSizeUndo(width, height, offsetX, offsetY) {
        var snapshotSize = self.getCanvasSize();
        var snapshotDatas = [];
        var w = snapshotSize.width;
        var h = snapshotSize.height;
        for (var i = 0; i < layers.length; ++i) {
            var layerContext = getLayerContext(i);
            snapshotDatas[i] = layerContext.getImageData(0, 0, w, h);
        }
        function setSize(width, height, offsetX, offsetY) {
            self.lockHistory();
            self.setCanvasSize(width, height, offsetX, offsetY);
            self.unlockHistory();
        }
        var rollback = function () {
            setSize(w, h);
            for (var i = 0; i < layers.length; ++i) {
                var layerContext = getLayerContext(i);
                layerContext.putImageData(snapshotDatas[i], 0, 0);
            }
            return redo;
        }
        var redo = function () {
            rollback();
            setSize(width, height, offsetX, offsetY);
            return rollback;
        }
        pushUndo(rollback);
    }
    var size = {width: domElement.width, height: domElement.height};
    self.getCanvasSize = function () {
        return {width: size.width, height: size.height}; //clone size
    };
    self.setCanvasSize = function (width, height, offsetX, offsetY) {
        offsetX = (offsetX == null) ? 0 : offsetX;
        offsetY = (offsetY == null) ? 0 : offsetY;
        pushCanvasSizeUndo(width, height, offsetX, offsetY);
        size.width = width = Math.floor(width);
        size.height = height = Math.floor(height);
        paintingCanvas.width = width;
        paintingCanvas.height = height;
        dirtyRectDisplay.width = width;
        dirtyRectDisplay.height = height;
        // domElement.style.width = width + 'px';
        // domElement.style.height = height + 'px';
        for (var i=0; i<layers.length; ++i) {
            var canvas = getLayerCanvas(i);
            var context = getLayerContext(i);
            var imageData = context.getImageData(0, 0, width, height);
            canvas.width = width;
            canvas.height = height;
            context.putImageData(imageData, offsetX, offsetY);
        }
    };
    self.getCanvasWidth = function () {
        return size.width;
    };
    self.setCanvasWidth = function (width, offsetX) {
        self.setCanvasSize(width, size.height, offsetX, 0);
    };
    self.getCanvasHeight = function () {
        return size.height;
    };
    self.setCanvasHeight = function (height, offsetY) {
        self.setCanvasSize(size.width, height, 0, offsetY);
    };
    function getLayerCanvas(index) {
        // return layers[index].getElementsByClassName('croquis-layer-canvas')[0];
        return domElement;
    }
    self.getLayerCanvas = getLayerCanvas;
    function getLayerContext(index) {
        // return getLayerCanvas(index).getContext('2d', {willReadFrequently: true});
        return myContext;
    }
    var layers = [];
    var layerIndex = 0;
    var paintingCanvas = document.createElement('canvas');
    var paintingContext = paintingCanvas.getContext('2d'/*, {willReadFrequently: true}*/);
    paintingCanvas.className = 'croquis-painting-canvas';
    paintingCanvas.style.position = 'absolute';
    var dirtyRectDisplay = document.createElement('canvas');
    var dirtyRectDisplayContext = dirtyRectDisplay.getContext('2d'/*, {willReadFrequently: true}*/);
    dirtyRectDisplay.className = 'croquis-dirty-rect-display';
    dirtyRectDisplay.style.position = 'absolute';
    var renderDirtyRect = false;
    function sortLayers() {
        while (domElement.firstChild)
            domElement.removeChild(domElement.firstChild);
        for (var i = 0; i < layers.length; ++i) {
            var layer = layers[i];
            domElement.appendChild(layer);
        }
        domElement.appendChild(dirtyRectDisplay);
    }
    function drawDirtyRect(x, y, w, h) {
        var context = dirtyRectDisplayContext;
        context.fillStyle = '#f00';
        context.globalCompositeOperation = 'source-over';
        context.fillRect(x, y, w, h);
        if ((w > 2) && (h > 2)) {
            context.globalCompositeOperation = 'destination-out';
            context.fillRect(x + 1, y + 1, w - 2, h - 2);
        }
    }
    self.getRenderDirtyRect = function () {
        return renderDirtyRect;
    };
    self.setRenderDirtyRect = function (render) {
        renderDirtyRect = render;
        if (render == false)
            dirtyRectDisplayContext.clearRect(0, 0, size.width, size.height);
    };
    self.createLayerThumbnail = function (index, width, height) {
        index = (index == null) ? layerIndex : index;
        width = (width == null) ? size.width : width;
        height = (height == null) ? size.height : height;
        var canvas = getLayerCanvas(index);
        var thumbnail = document.createElement('canvas');
        var thumbnailContext = thumbnail.getContext('2d'/*, {willReadFrequently: true}*/);
        thumbnail.width = width;
        thumbnail.height = height;
        thumbnailContext.drawImage(canvas, 0, 0, width, height);
        return thumbnail;
    };
    self.createFlattenThumbnail = function (width, height) {
        width = (width == null) ? size.width : width;
        height = (height == null) ? size.height : height;
        var thumbnail = document.createElement('canvas');
        var thumbnailContext = thumbnail.getContext('2d'/*, {willReadFrequently: true}*/);
        thumbnail.width = width;
        thumbnail.height = height;
        for (var i = 0; i < layers.length; ++i) {
            if (!self.getLayerVisible(i))
                continue;
            var canvas = getLayerCanvas(i);
            thumbnailContext.globalAlpha = self.getLayerOpacity(i);
            thumbnailContext.drawImage(canvas, 0, 0, width, height);
        }
        return thumbnail;
    };
    self.getLayers = function () {
        return layers.concat(); //clone layers
    };
    self.getLayerCount = function () {
        return layers.length;
    };
    self.addLayer = function (index) {
        index = (index == null) ? layers.length : index;
        pushAddLayerUndo(index);
        var layer = document.createElement('div');
        layer.className = 'croquis-layer';
        layer.style.visibility = 'visible';
        layer.style.opacity = 1;
        var canvas = document.createElement('canvas');
        canvas.className = 'croquis-layer-canvas';
        canvas.width = size.width;
        canvas.height = size.height;
        canvas.style.position = 'absolute';
        layer.appendChild(canvas);
        domElement.appendChild(layer);
        layers.splice(index, 0, layer);
        sortLayers();
        self.selectLayer(layerIndex);
        dispatchEvent('onlayeradd', {index: index});
        if (self.onLayerAdded)
            self.onLayerAdded(index);
        return layer;
    };
    self.removeLayer = function (index) {
        index = (index == null) ? layerIndex : index;
        pushRemoveLayerUndo(index);
        domElement.removeChild(layers[index]);
        layers.splice(index, 1);
        if (layerIndex == layers.length)
            self.selectLayer(layerIndex - 1);
        sortLayers();
        dispatchEvent('onlayerremove', {index: index});
        if (self.onLayerRemoved)
            self.onLayerRemoved(index);
    };
    self.removeAllLayer = function () {
        while (layers.length)
            self.removeLayer(0);
    };
    self.swapLayer = function (layerA, layerB) {
        pushSwapLayerUndo(layerA, layerB);
        var layer = layers[layerA];
        layers[layerA] = layers[layerB];
        layers[layerB] = layer;
        sortLayers();
        dispatchEvent('onlayerswap', {a: layerA, b: layerB});
        if (self.onLayerSwapped)
            self.onLayerSwapped(layerA, layerB);
    };
    self.getCurrentLayerIndex = function () {
        return layerIndex;
    };
    self.selectLayer = function (index) {
        var lastestLayerIndex = layers.length - 1;
        if (index > lastestLayerIndex)
            index = lastestLayerIndex;
        layerIndex = index;
        if (paintingCanvas.parentElement != null)
            paintingCanvas.parentElement.removeChild(paintingCanvas);
        layers[index].appendChild(paintingCanvas);
        dispatchEvent('onlayerselect', {index: index});
        if (self.onLayerSelected)
            self.onLayerSelected(index);
    };
    self.clearLayer = function (index) {
        index = (index == null) ? layerIndex : index;
        pushContextUndo(index);
        var context = getLayerContext(index);
        context.clearRect(0, 0, size.width, size.height);
    };
    self.fillLayer = function (fillColor, index) {
        index = (index == null) ? layerIndex : index;
        pushContextUndo(index);
        var context = getLayerContext(index);
        context.fillStyle = fillColor;
        context.fillRect(0, 0, size.width, size.height);
    }
    self.fillLayerRect = function (fillColor, x, y, width, height, index) {
        index = (index == null) ? layerIndex : index;
        pushDirtyRectUndo(x, y, width, height, index);
        var context = getLayerContext(index);
        context.fillStyle = fillColor;
        context.fillRect(x, y, width, height);
    }
    self.floodFill = function (x, y, r, g, b, a, index) {
        index = (index == null) ? layerIndex : index;
        pushContextUndo(index);
        var context = getLayerContext(index);
        var w = size.width;
        var h = size.height;
        if ((x < 0) || (x >= w) || (y < 0) || (y >= h))
            return;
        var imageData = context.getImageData(0, 0, w, h);
        var d = imageData.data;
        var targetColor = getColor(x, y);
        var replacementColor = (r << 24) | (g << 16) | (b << 8) | a;
        if (targetColor === replacementColor)
            return;
        function getColor(x, y) {
            var index = ((y * w) + x) * 4;
            return ((d[index] << 24) | (d[index + 1] << 16) |
                (d[index + 2] << 8) | d[index + 3]);
        }
        function setColor(x, y) {
            var index = ((y * w) + x) * 4;
            d[index] = r;
            d[index + 1] = g;
            d[index + 2] = b;
            d[index + 3] = a;
        }
        var queue = [];
        queue.push(x, y);
        while (queue.length) {
            var nx = queue.shift();
            var ny = queue.shift();
            if ((nx < 0) || (nx >= w) || (ny < 0) || (ny >= h) ||
                (getColor(nx, ny) !== targetColor))
                continue;
            var west, east;
            west = east = nx;
            do {
                var wc = getColor(--west, ny);
            } while ((west >= 0) && (wc === targetColor));
            do {
                var ec = getColor(++east, ny);
            } while ((east < w) && (ec === targetColor));
            for (var i = west + 1; i < east; ++i) {
                setColor(i, ny);
                var north = ny - 1;
                var south = ny + 1;
                if (getColor(i, north) === targetColor)
                    queue.push(i, north);
                if (getColor(i, south) === targetColor)
                    queue.push(i, south);
            }
        }
        context.putImageData(imageData, 0, 0);
    }
    self.getLayerOpacity = function (index) {
        index = (index == null) ? layerIndex : index;
        var opacity = parseFloat(
            layers[index].style.getPropertyValue('opacity'));
        return window.isNaN(opacity) ? 1 : opacity;
    }
    self.setLayerOpacity = function (opacity, index) {
        index = (index == null) ? layerIndex : index;
        pushLayerOpacityUndo(index);
        layers[index].style.opacity = opacity;
    }
    self.getLayerVisible = function (index) {
        index = (index == null) ? layerIndex : index;
        var visible = layers[index].style.getPropertyValue('visibility');
        return visible != 'hidden';
    }
    self.setLayerVisible = function (visible, index) {
        index = (index == null) ? layerIndex : index;
        pushLayerVisibleUndo(index);
        layers[index].style.visibility = visible ? 'visible' : 'hidden';
    }
    var tool;
    var toolStabilizeLevel = 0;
    var toolStabilizeWeight = 0.8;
    var stabilizer = null;
    var stabilizerInterval = 5;
    var tick;
    var tickInterval = 10;
    var paintingOpacity = 1;
    var paintingKnockout = false;
    self.getTool = function () {
        return tool;
    }
    self.setTool = function (value) {
        tool = value;
        // paintingContext = paintingCanvas.getContext('2d', {willReadFrequently: true});
        paintingContext = myContext;
        if (tool && tool.setContext)
            tool.setContext(paintingContext);
    }
    self.setTool(new Croquis.Brush());
    self.getPaintingOpacity = function () {
        return paintingOpacity;
    }
    self.setPaintingOpacity = function (opacity) {
        paintingOpacity = opacity;
        paintingCanvas.style.opacity = opacity;
    }
    self.getPaintingKnockout = function () {
        return paintingKnockout;
    }
    self.setPaintingKnockout = function (knockout) {
        paintingKnockout = knockout;
        paintingCanvas.style.visibility = knockout ? 'hidden' : 'visible';
    }
    self.getTickInterval = function () {
        return tickInterval;
    }
    self.setTickInterval = function (interval) {
        tickInterval = interval;
    }
    /*
    stabilize level is the number of coordinate tracker.
    higher stabilize level makes lines smoother.
    */
    self.getToolStabilizeLevel = function () {
        return toolStabilizeLevel;
    }
    self.setToolStabilizeLevel = function (level) {
        toolStabilizeLevel = (level < 0) ? 0 : level;
    }
    /*
    higher stabilize weight makes trackers follow slower.
    */
    self.getToolStabilizeWeight = function () {
        return toolStabilizeWeight;
    }
    self.setToolStabilizeWeight = function (weight) {
        toolStabilizeWeight = weight;
    }
    self.getToolStabilizeInterval = function () {
        return stabilizerInterval;
    }
    self.setToolStabilizeInterval = function (interval) {
        stabilizerInterval = interval;
    }
    var isDrawing = false;
    var isStabilizing = false;
    var beforeKnockout = document.createElement('canvas');
    var knockoutTick;
    var knockoutTickInterval = 20;
    function gotoBeforeKnockout() {
        var context = getLayerContext(layerIndex);
        var w = size.width;
        var h = size.height;
        context.clearRect(0, 0, w, h);
        context.drawImage(beforeKnockout, 0, 0, w, h);
    }
    function drawPaintingCanvas() { //draw painting canvas on current layer
        var context = getLayerContext(layerIndex);
        var w = size.width;
        var h = size.height;
        context.save();
        context.globalAlpha = paintingOpacity;
        context.globalCompositeOperation = paintingKnockout ?
            'destination-out' : 'source-over';
        context.drawImage(paintingCanvas, 0, 0, w, h);
        context.restore();
    }
    function _move(x, y, pressure, azimuthAngle) {
        if (tool.move)
            tool.move(x, y, pressure, azimuthAngle);
        dispatchEvent('onmove', {x: x, y: y, pressure: pressure});
        if (self.onMoved)
            self.onMoved(x, y, pressure);
    }
    function _up(x, y, pressure, azimuthAngle) {
        isDrawing = false;
        isStabilizing = false;
        var dirtyRect;
        if (tool.up)
            dirtyRect = tool.up(x, y, pressure, azimuthAngle);
        // if (paintingKnockout)
        //     gotoBeforeKnockout();
        // if (dirtyRect)
        //     pushDirtyRectUndo(dirtyRect.x, dirtyRect.y,
        //                       dirtyRect.width, dirtyRect.height);
        // else
        //     pushContextUndo();
        drawPaintingCanvas();
        if (opts.grainEffect == 2 && opts.patternCol.indexOf("none") == -1)
        {
            convertToImg();
            paintingContext.clearRect(0, 0, size.width, size.height);
        }
        dirtyRect = dirtyRect ||
            {x: 0, y: 0, width: size.width, height: size.height};
        dispatchEvent('onup',
            {x: x, y: y, pressure: pressure, dirtyRect: dirtyRect});
        if (self.onUpped)
            self.onUpped(x, y, pressure, dirtyRect);
        window.clearInterval(knockoutTick);
        window.clearInterval(tick);
    }
    self.down = function (x, y, pressure, azimuthAngle) {
        if (isDrawing || isStabilizing)
            throw 'still drawing';
        isDrawing = true;
        if (tool == null)
            return;
        if (paintingKnockout) {
            // var w = size.width;
            // var h = size.height;
            // var canvas = getLayerCanvas(layerIndex);
            // var beforeKnockoutContext = beforeKnockout.getContext('2d'/*, {willReadFrequently: true}*/);
            // beforeKnockout.width = w;
            // beforeKnockout.height = h;
            // beforeKnockoutContext.clearRect(0, 0, w, h);
            // beforeKnockoutContext.drawImage(canvas, 0, 0, w, h);
        }
        pressure = (pressure == null) ? Croquis.Tablet.pressure() : pressure;
        var down = tool.down;
        if (toolStabilizeLevel > 0) {
            stabilizer = new Croquis.Stabilizer(down, _move, _up,
                toolStabilizeLevel, toolStabilizeWeight,
                x, y, pressure, azimuthAngle, stabilizerInterval);
            isStabilizing = true;
        }
        else if (down != null)
            down(x, y, pressure, azimuthAngle);
        dispatchEvent('ondown', {x: x, y: y, pressure: pressure});
        if (self.onDowned)
            self.onDowned(x, y, pressure);
        // knockoutTick = window.setInterval(function () {
        //     if (paintingKnockout) {
        //         gotoBeforeKnockout();
        //         drawPaintingCanvas();
        //     }
        // }, knockoutTickInterval);
        // tick = window.setInterval(function () {
        //     if (tool.tick)
        //         tool.tick();
        //     dispatchEvent('ontick');
        //     if (self.onTicked)
        //         self.onTicked();
        // }, tickInterval);
    };
    self.move = function (x, y, pressure, azimuthAngle) {
        if (!isDrawing)
            throw 'you need to call \'down\' first';
        if (tool == null)
            return;
        pressure = (pressure == null) ? Croquis.Tablet.pressure() : pressure;
        if (stabilizer != null)
            stabilizer.move(x, y, pressure, azimuthAngle);
        else if (!isStabilizing)
            _move(x, y, pressure, azimuthAngle);
    };
    self.up = function (x, y, pressure, azimuthAngle) {
        if (!isDrawing)
            throw 'you need to call \'down\' first';
        if (tool == null) {
            isDrawing = false;
            return;
        }
        pressure = (pressure == null) ? Croquis.Tablet.pressure() : pressure;
        if (stabilizer != null)
            stabilizer.up(x, y, pressure, azimuthAngle);
        else
            _up(x, y, pressure, azimuthAngle);
        stabilizer = null;
    };
    // apply image data
    (function (croquis, imageDataList) {
        if (imageDataList != null) {
            if (imageDataList.length == 0)
                return;
            croquis.lockHistory();
            var first = imageDataList[0];
            croquis.setCanvasSize(first.width, first.height);
            for (var i = 0; i < imageDataList.length; ++i) {
                var current = imageDataList[i];
                if ((current.width != first.width) ||
                    (current.height != first.height))
                    throw 'all image data must have same size';
                croquis.addLayer();
                var context = croquis.getLayerCanvas(i).getContext('2d'/*, {willReadFrequently: true}*/);
                context.putImageData(current, 0, 0);
            }
            croquis.selectLayer(0);
            croquis.unlockHistory();
        }
    }).call(null, self, imageDataList);
}
Croquis.createChecker = function (cellSize, colorA, colorB) {
    cellSize = (cellSize == null) ? 10 : cellSize;
    colorA = (colorA == null) ? '#fff' : colorA;
    colorB = (colorB == null) ? '#ccc' : colorB;
    var size = cellSize + cellSize;
    var checker = document.createElement('canvas');
    checker.width = checker.height = size;
    var context = checker.getContext('2d'/*, {willReadFrequently: true}*/);
    context.fillStyle = colorB;
    context.fillRect(0, 0, size, size);
    context.fillStyle = colorA;
    context.fillRect(0, 0, cellSize, cellSize);
    context.fillRect(cellSize, cellSize, size, size);
    return checker;
}
Croquis.createBrushPointer = function (brushImage, brushSize, brushAngle,
                                       threshold, antialias, color) {
    brushSize = brushSize | 0;
    var pointer = document.createElement('canvas');
    var pointerContext = pointer.getContext('2d'/*, {willReadFrequently: true}*/);
    if (brushSize == 0) {
        pointer.width = 1;
        pointer.height = 1;
        return pointer;
    }
    if (brushImage == null) {
        var halfSize = (brushSize * 0.5) | 0;
        pointer.width = brushSize;
        pointer.height = brushSize;
        pointerContext.fillStyle = '#000';
        pointerContext.beginPath();
        pointerContext.arc(halfSize, halfSize, halfSize, 0, Math.PI * 2);
        pointerContext.closePath();
        pointerContext.fill();
    }
    else {
        var width = brushSize;
        var height = brushSize * (brushImage.height / brushImage.width);
        var toRad = Math.PI / 180;
        var ra = brushAngle * toRad;
        var abs = Math.abs;
        var sin = Math.sin;
        var cos = Math.cos;
        var boundWidth = abs(height * sin(ra)) + abs(width * cos(ra));
        var boundHeight = abs(width * sin(ra)) + abs(height * cos(ra));
        pointer.width = boundWidth;
        pointer.height = boundHeight;
        pointerContext.save();
        pointerContext.translate(boundWidth * 0.5, boundHeight * 0.5);
        pointerContext.rotate(ra);
        pointerContext.translate(width * -0.5, height * -0.5);
        pointerContext.drawImage(brushImage, 0, 0, width, height);
        pointerContext.restore();
    }
    return Croquis.createAlphaThresholdBorder(
            pointer, threshold, antialias, color);
};
Croquis.createAlphaThresholdBorder = function (image, threshold,
                                               antialias, color) {
    threshold = (threshold == null) ? 0x80 : threshold;
    color = (color == null) ? '#000' : color;
    var width = image.width;
    var height = image.height;
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d'/*, {willReadFrequently: true}*/);
    canvas.width = width;
    canvas.height = height;
    try {
        context.drawImage(image, 0, 0, width, height);
    }
    catch (e) {
        return canvas;
    }
    var imageData = context.getImageData(0, 0, width, height);
    var d = imageData.data;
    function getAlphaIndex(index) {
        return d[index * 4 + 3];
    }
    function setRedIndex(index, red) {
        d[index * 4] = red;
    }
    function getRedXY(x, y) {
        var red = d[((y * width) + x) * 4];
        return red ? red : 0;
    }
    function getGreenXY(x, y) {
        var green = d[((y * width) + x) * 4 + 1];
        return green;
    }
    function setColorXY(x, y, red, green, alpha) {
        var i = ((y * width) + x) * 4;
        d[i] = red;
        d[i + 1] = green;
        d[i + 2] = 0;
        d[i + 3] = alpha;
    }
    //threshold
    var pixelCount = (d.length * 0.25) | 0;
    for (var i = 0; i < pixelCount; ++i)
        setRedIndex(i, (getAlphaIndex(i) < threshold) ? 0 : 1);
    //outline
    var x;
    var y;
    for (x = 0; x < width; ++x) {
        for (y = 0; y < height; ++y) {
            if (!getRedXY(x, y)) {
                setColorXY(x, y, 0, 0, 0);
            }
            else {
                var redCount = 0;
                var left = x - 1;
                var right = x + 1;
                var up = y - 1;
                var down = y + 1;
                redCount += getRedXY(left, up);
                redCount += getRedXY(left, y);
                redCount += getRedXY(left, down);
                redCount += getRedXY(right, up);
                redCount += getRedXY(right, y);
                redCount += getRedXY(right, down);
                redCount += getRedXY(x, up);
                redCount += getRedXY(x, down);
                if (redCount != 8)
                    setColorXY(x, y, 1, 1, 255);
                else
                    setColorXY(x, y, 1, 0, 0);
            }
        }
    }
    //antialias
    if (antialias) {
        for (x = 0; x < width; ++x) {
            for (y = 0; y < height; ++y) {
                if (getGreenXY(x, y)) {
                    var alpha = 0;
                    if (getGreenXY(x - 1, y) != getGreenXY(x + 1, y))
                        setColorXY(x, y, 1, 1, alpha += 0x40);
                    if (getGreenXY(x, y - 1) != getGreenXY(x, y + 1))
                        setColorXY(x, y, 1, 1, alpha + 0x50);
                }
            }
        }
    }
    context.putImageData(imageData, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
    return canvas;
}
Croquis.createFloodFill = function (canvas, x, y, r, g, b, a) {
    var result = document.createElement('canvas');
    var w = result.width = canvas.width;
    var h = result.height = canvas.height;
    if ((x < 0) || (x >= w) || (y < 0) || (y >= h) || !(r || g || b || a))
        return result;
    var originalContext = canvas.getContext('2d'/*, {willReadFrequently: true}*/);
    var originalData = originalContext.getImageData(0, 0, w, h);
    var od = originalData.data;
    var resultContext = result.getContext('2d'/*, {willReadFrequently: true}*/);
    var resultData = resultContext.getImageData(0, 0, w, h);
    var rd = resultData.data;
    var targetColor = getColor(x, y);
    var replacementColor = (r << 24) | (g << 16) | (b << 8) | a;
    function getColor(x, y) {
        var index = ((y * w) + x) * 4;
        return (rd[index] ? replacementColor :
            ((od[index] << 24) | (od[index + 1] << 16) |
             (od[index + 2] << 8) | od[index + 3]));
    }
    var queue = [];
    queue.push(x, y);
    while (queue.length) {
        var nx = queue.shift();
        var ny = queue.shift();
        if ((nx < 0) || (nx >= w) || (ny < 0) || (ny >= h) ||
            (getColor(nx, ny) !== targetColor))
            continue;
        var west, east;
        west = east = nx;
        do {
            var wc = getColor(--west, ny);
        } while ((west >= 0) && (wc === targetColor));
        do {
            var ec = getColor(++east, ny);
        } while ((east < w) && (ec === targetColor));
        for (var i = west + 1; i < east; ++i) {
            rd[((ny * w) + i) * 4] = 1;
            var north = ny - 1;
            var south = ny + 1;
            if (getColor(i, north) === targetColor)
                queue.push(i, north);
            if (getColor(i, south) === targetColor)
                queue.push(i, south);
        }
    }
    for (var i = 0; i < w; ++i) {
        for (var j = 0; j < h; ++j) {
            var index = ((j * w) + i) * 4;
            if (rd[index] == 0)
                continue;
            rd[index] = r;
            rd[index + 1] = g;
            rd[index + 2] = b;
            rd[index + 3] = a;
        }
    }
    resultContext.putImageData(resultData, 0, 0);
    return result;
}

Croquis.Tablet = {};
Croquis.Tablet.plugin = function () {
    var plugin = document.querySelector(
        'object[type=\'application/x-wacomtabletplugin\']');
    if (!plugin) {
        plugin = document.createElement('object');
        plugin.type = 'application/x-wacomtabletplugin';
        plugin.style.position = 'absolute';
        plugin.style.top = '-1000px';
        document.body.appendChild(plugin);
    }
    return plugin;
}
Croquis.Tablet.pen = function () {
    var plugin = Croquis.Tablet.plugin();
    return plugin.penAPI;
}
Croquis.Tablet.pressure = function () {
    var pen = Croquis.Tablet.pen();
    return (pen && pen.pointerType) ? pen.pressure : 1;
}
Croquis.Tablet.isEraser = function () {
    var pen = Croquis.Tablet.pen();
    return pen ? pen.isEraser : false;
}

Croquis.Stabilizer = function (down, move, up, level, weight,
                               x, y, pressure, azimuthAngle, interval) {
    interval = interval || 5;
    var follow = 1 - Math.min(0.95, Math.max(0, weight));
    var paramTable = [];
    var current = { x: x, y: y, pressure: pressure };
    for (var i = 0; i < level; ++i)
        paramTable.push({ x: x, y: y, pressure: pressure });
    var first = paramTable[0];
    var last = paramTable[paramTable.length - 1];
    var upCalled = false;
    if (down != null)
        down(x, y, pressure, azimuthAngle);
    window.setTimeout(_move, interval);
    this.getParamTable = function () { //for test
        return paramTable;
    }
    this.move = function (x, y, pressure) {
        current.x = x;
        current.y = y;
        current.pressure = pressure;
    }
    this.up = function (x, y, pressure) {
        current.x = x;
        current.y = y;
        current.pressure = pressure;
        upCalled = true;
    }
    function dlerp(a, d, t) {
        return a + d * t;
    }
    function _move(justCalc) {
        var curr;
        var prev;
        var dx;
        var dy;
        var dp;
        var delta = 0;
        first.x = current.x;
        first.y = current.y;
        first.pressure = current.pressure;
        for (var i = 1; i < paramTable.length; ++i) {
            curr = paramTable[i];
            prev = paramTable[i - 1];
            dx = prev.x - curr.x;
            dy = prev.y - curr.y;
            dp = prev.pressure - curr.pressure;
            delta += Math.abs(dx);
            delta += Math.abs(dy);
            curr.x = dlerp(curr.x, dx, follow);
            curr.y = dlerp(curr.y, dy, follow);
            curr.pressure = dlerp(curr.pressure, dp, follow);
        }
        if (justCalc)
            return delta;
        if (upCalled) {
            while(delta > 1) {
                move(last.x, last.y, last.pressure, azimuthAngle);
                delta = _move(true);
            }
            up(last.x, last.y, last.pressure, azimuthAngle);
        }
        else {
            move(last.x, last.y, last.pressure, azimuthAngle);
            window.setTimeout(_move, interval);
        }
    }
}

Croquis.Random = {};
Croquis.Random.LFSR113 = function (seed) {
    var IA = 16807;
    var IM = 2147483647;
    var IQ = 127773;
    var IR = 2836;
    var a, b, c, d, e;
    this.get = function () {
        var f = ((a << 6) ^ a) >> 13;
        a = ((a & 4294967294) << 18) ^ f;
        f  = ((b << 2) ^ b) >> 27;
        b = ((b & 4294967288) << 2) ^ f;
        f  = ((c << 13) ^ c) >> 21;
        c = ((c & 4294967280) << 7) ^ f;
        f  = ((d << 3) ^ d) >> 12;
        d = ((d & 4294967168) << 13) ^ f;
        return (a ^ b ^ c ^ d) * 2.3283064365386963e-10 + 0.5;
    }
    seed |= 0;
    if (seed <= 0) seed = 1;
    e = (seed / IQ) | 0;
    seed = (((IA * (seed - ((e * IQ) | 0))) | 0) - ((IR * e) | 0)) | 0;
    if (seed < 0) seed = (seed + IM) | 0;
    if (seed < 2) a = (seed + 2) | 0 ; else a = seed;
    e = (seed / IQ) | 0;
    seed = (((IA * (seed - ((e * IQ) | 0))) | 0) - ((IR * e) | 0)) | 0;
    if (seed < 0) seed = (seed + IM) | 0;
    if (seed < 8) b = (seed + 8) | 0; else b = seed;
    e = (seed / IQ) | 0;
    seed = (((IA * (seed - ((e * IQ) | 0))) | 0) - ((IR * e) | 0)) | 0;
    if (seed < 0) seed = (seed + IM) | 0;
    if (seed < 16) c = (seed + 16) | 0; else c = seed;
    e = (seed / IQ) | 0;
    seed = (((IA * (seed - ((e * IQ) | 0))) | 0) - ((IR * e) | 0)) | 0;
    if (seed < 0) seed = (seed + IM) | 0;
    if (seed < 128) d = (seed + 128) | 0; else d = seed;
    this.get();
}

//color modify function
var RGBToHSL = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
      ? l === r
        ? (g - b) / s
        : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
      : 0;
    return [
      60 * h < 0 ? 60 * h + 360 : 60 * h,
      100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
      (100 * (2 * l - s)) / 2,
    ];
};
var HSLToRGB = (h, s, l) => {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [255 * f(0), 255 * f(8), 255 * f(4)];
};
var RGBToHSB = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const v = Math.max(r, g, b),
        n = v - Math.min(r, g, b);
    const h =
        n === 0 ? 0 : n && v === r ? (g - b) / n : v === g ? 2 + (b - r) / n : 4 + (r - g) / n;
    return [60 * (h < 0 ? h + 6 : h), v && (n / v) * 100, v * 100];
};
var HSBToRGB = (h, s, b) => {
    s /= 100;
    b /= 100;
    const k = (n) => (n + h / 60) % 6;
    const f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    return [255 * f(5), 255 * f(3), 255 * f(1)];
};

var darker = function(r, g,b, alpha) {
    return [Math.max((int)(r * FACTOR), 0),
         Math.max((int)(g * FACTOR), 0),
         Math.max((int)(b * FACTOR), 0),
         getAlpha()];
}

var brighter = function(r,g, b, alpha, FACTOR) {
    var i = (int)(1.0 / (1.0 - FACTOR));
    if ( r == 0 && g == 0 && b == 0) {
        return new Color(i, i, i, alpha);
    }
    if ( r > 0 && r < i ) r = i;
    if ( g > 0 && g < i ) g = i;
    if ( b > 0 && b < i ) b = i;

    return [Math.min((int)(r/FACTOR), 255),
         Math.min((int)(g/FACTOR), 255),
         Math.min((int)(b/FACTOR), 255),
         alpha];
}
//

Croquis.Brush = function () {
    // math shortcut
    var min = Math.min;
    var max = Math.max;
    var abs = Math.abs;
    var sin = Math.sin;
    var cos = Math.cos;
    var sqrt = Math.sqrt;
    var atan2 = Math.atan2;
    var PI = Math.PI;
    var ONE = PI + PI;
    var QUARTER = PI * 0.5;
    var random = Math.random;
    this.setRandomFunction = function (value) {
        random = value;
    }
    this.clone = function () {
        var clone = new Brush(context);
        clone.setColor(this.getColor());
        clone.setFlow(this.getFlow());
        clone.setSize(this.getSize());
        clone.setSpacing(this.getSpacing());
        clone.setAngle(this.getAngle());
        clone.setRotateToDirection(this.getRotateToDirection());
        clone.setNormalSpread(this.getNormalSpread());
        clone.setTangentSpread(this.getTangentSpread());
        clone.setImage(this.getImage());
    }
    var context = null;
    var freezeContext = null, oContext = null;
    var shapePreviewContext = null;
    var drawflag = false;
    this.getContext = function () {
        return context;
    }
    this.setContext = function (value) {
        context = value;
        shapePreviewContext = cloneContext(context);
        if (USE_BLEND_MODE)
        {
            oContext = cloneContext(context);
            freezeContext = cloneContext(context);
            freezeContext.clearRect(0, 0, freezeContext.canvas.width, freezeContext.canvas.height);
            freezeContext.drawImage(context.canvas, 0, 0);
        }
    }
    this.setClear = function () {
        if (USE_BLEND_MODE)
            freezeContext.clearRect(0, 0, freezeContext.canvas.width, freezeContext.canvas.height);
    }
    var color = [0, 0, 0], firstcolor = '#000', secondarycolor = '#fff';
    this.getColor = function () {
        return color;
    }
    this.setColor = function (value = '#000', second = '#fff') {
        firstcolor = value;
        secondarycolor = second;
        transformedImageIsDirty = true;
    }

    var spacing = 0.01;
    this.getSpacing = function () {
        return spacing;
    }
    this.setSpacing = function (value) {
        spacing = (value < 0.01) ? 0.01 : value;
    }
    var toRad = PI / 180;
    var toDeg = 1 / toRad;
    var angle = 0; // radian unit
    this.getAngle = function () { // returns degree unit
        return angle * toDeg;
    }
    this.setAngle = function (value) {
        angle = value * toRad;
    }
    var rotateToDirection = false;
    this.getRotateToDirection = function () {
        return rotateToDirection;
    }
    this.setRotateToDirection = function (value) {
        rotateToDirection = value;
    }
    var patternCol = "";
    this.setPatternCol = function (value) {
        patternCol = value;
    }
    var grainEffect = 0;
    this.getGrainEffect = function () {
        return grainEffect;
    }
    this.setGrainEffect = function (value) {
        grainEffect = value;
    }
    var normalSpread = 0;
    this.getNormalSpread = function () {
        return normalSpread;
    }
    this.setNormalSpread = function (value) {
        normalSpread = value;
    }
    var tangentSpread = 0;
    this.getTangentSpread = function () {
        return tangentSpread;
    }
    this.setTangentSpread = function (value) {
        tangentSpread = value;
    }
    //stroke attributes
    var fallOff = 0;
    this.getFallOff = function () {
        return fallOff;
    }
    this.setFallOff = function (value) {
        fallOff = value;
    }
    //taper attributes
    var taperMinAmount = 0;
    this.getTaperMinAmount = function () {
        return taperMinAmount;
    }
    this.setTaperMinAmount = function (value) {
        taperMinAmount = value;
    }
    var taperMaxAmount = 1;
    this.getTaperMaxAmount = function () {
        return taperMaxAmount;
    }
    this.setTaperMaxAmount = function (value) {
        taperMaxAmount = value;
    }
    var taperSize = 0;
    this.getTaperSize = function () {
        return taperSize;
    }
    this.setTaperSize = function (value) {
        taperSize = value;
    }
    var taperOpacity = 0;
    this.getTaperOpacity = function () {
        return taperOpacity;
    }
    this.setTaperOpacity = function (value) {
        taperOpacity = value;
    }
    var taperTip = 0;
    this.getTaperTip = function () {
        return taperTip;
    }
    this.setTaperTip = function (value) {
        taperTip = value;
    }
    //shape attributes
    var shapeScatter = 0;
    this.getShapeScatter = function () {
        return shapeScatter;
    }
    this.setShapeScatter = function (value) {
        shapeScatter = value;
    }
    var shapeRotation = 0;
    this.getShapeRotation = function () {
        return shapeRotation;
    }
    this.setShapeRotation = function (value) {
        shapeRotation = value;
    }
    var shapeCount = 1;
    this.getShapeCount = function () {
        return shapeCount;
    }
    this.setShapeCount = function (value) {
        shapeCount = parseInt(value);
        if (shapeCount < 1)
            shapeCount = 1;
    }
    var shapeCountJitter = 0;
    this.getShapeCountJitter = function () {
        return shapeCountJitter;
    }
    this.setShapeCountJitter = function (value) {
        shapeCountJitter = value;
    }
    var shapeRandomized = false;
    this.getShapeRandomized = function () {
        return shapeRandomized;
    }
    this.setShapeRandomized = function (value) {
        shapeRandomized = value;
    }
    var shapeAzimuth = 0;
    this.getShapeAzimuth = function () {
        return shapeAzimuth;
    }
    this.setShapeAzimuth = function (value) {
        shapeAzimuth = value;
    }
    var shapeFlipX = false;
    this.getShapeFlipX = function () {
        return shapeFlipX;
    }
    this.setShapeFlipX = function (value) {
        shapeFlipX = value;
    }
    var shapeFlipY = false;
    this.getShapeFlipY = function () {
        return shapeFlipY;
    }
    this.setShapeFlipY = function (value) {
        shapeFlipY = value;
    }
    //grain attributes
    var grainMovement = 1;
    this.getGrainMovement = function () {
        return grainMovement;
    }
    this.setGrainMovement = function (value) {
        grainMovement = value;
    }
    var grainMoveScale = 1;
    this.getGrainMoveScale = function () {
        return grainMoveScale;
    }
    this.setGrainMoveScale = function (value) {
        grainMoveScale = value;
    }
    var grainMoveZoom = 1;
    this.getGrainMoveZoom = function () {
        return grainMoveZoom;
    }
    this.setGrainMoveZoom = function (value) {
        grainMoveZoom = value;
    }
    var grainMoveRotation = 0;
    this.getGrainMoveRotation = function () {
        return grainMoveRotation;
    }
    this.setGrainMoveRotation = function (value) {
        grainMoveRotation = value;
    }
    var grainMoveDepth = 1;
    this.getGrainMoveDepth = function () {
        return grainMoveDepth;
    }
    this.setGrainMoveDepth = function (value) {
        grainMoveDepth = value;
    }
    var grainMoveOffsetJitter = false, grainMoveOffsetJitterVal = 0;
    this.getGrainMoveOffsetJitter = function () {
        return grainMoveOffsetJitter;
    }
    this.setGrainMoveOffsetJitter = function (value) {
        grainMoveOffsetJitter = value;
    }
    var grainTexScale = 1;
    this.getGrainTexScale = function () {
        return grainTexScale;
    }
    this.setGrainTexScale = function (value) {
        grainTexScale = value;
    }
    var grainTexDepth = 1;
    this.getGrainTexDepth = function () {
        return grainTexDepth;
    }
    this.setGrainTexDepth = function (value) {
        grainTexDepth = value;
    }
    var grainTexBrightness = 0;
    this.getGrainTexBrightness = function () {
        return grainTexBrightness;
    }
    this.setGrainTexBrightness = function (value) {
        grainTexBrightness = value;
    }
    var grainTexContrast = 0;
    this.getGrainTexContrast = function () {
        return grainTexContrast;
    }
    this.setGrainTexContrast = function (value) {
        grainTexContrast = value;
    }
    //dynamic attributes
    var dynamicSpeedSize = 0;
    this.getDynamicSpeedSize = function () {
        return dynamicSpeedSize;
    }
    this.setDynamicSpeedSize = function (value) {
        dynamicSpeedSize = value;
    }
    var dynamicSpeedOpacity = 0;
    this.getDynamicSpeedOpacity = function () {
        return dynamicSpeedOpacity;
    }
    this.setDynamicSpeedOpacity = function (value) {
        dynamicSpeedOpacity = value;
    }
    var dynamicJitterSize = 0;
    this.getDynamicJitterSize = function () {
        return dynamicJitterSize;
    }
    this.setDynamicJitterSize = function (value) {
        dynamicJitterSize = value;
    }
    var dynamicJitterOpacity = 0;
    this.getDynamicJitterOpacity = function () {
        return dynamicJitterOpacity;
    }
    this.setDynamicJitterOpacity = function (value) {
        dynamicJitterOpacity = value;
    }
    var dynamicBrushMaxSize = 1;
    this.getDynamicBrushMaxSize = function () {
        return dynamicBrushMaxSize;
    }
    this.setDynamicBrushMaxSize = function (value) {
        dynamicBrushMaxSize = value;
        this.setSize(-1);
    }
    var dynamicBrushMinSize = 0;
    this.getDynamicBrushMinSize = function () {
        return dynamicBrushMinSize;
    }
    this.setDynamicBrushMinSize = function (value) {
        this.setSize(-1);
        dynamicBrushMinSize = value;
    }
    var dynamicBrushMaxOpacity = 1;
    this.getDynamicBrushMaxOpacity = function () {
        return dynamicBrushMaxOpacity;
    }
    this.setDynamicBrushMaxOpacity = function (value) {
        dynamicBrushMaxOpacity = value;
    }
    var dynamicBrushMinOpacity = 0;
    this.getDynamicBrushMinOpacity = function () {
        return dynamicBrushMinOpacity;
    }
    this.setDynamicBrushMinOpacity = function (value) {
        dynamicBrushMinOpacity = value;
    }
    //color dynamics
    var stampHue = 0;
    this.getStampHue = function () {
        return getStampHue;
    }
    this.setStampHue = function (value) {
        stampHue = value;
    }
    var stampSaturation = 0;
    this.getStampSaturation = function () {
        return stampSaturation;
    }
    this.setStampSaturation = function (value) {
        stampSaturation = value;
    }
    var stampSecondaryColor = 0;
    this.getStampSecondaryColor = function () {
        return stampSecondaryColor;
    }
    this.setStampSecondaryColor = function (value) {
        stampSecondaryColor = value;
    }
    var strokeHue = 0;
    this.getStrokeHue = function () {
        return strokeHue;
    }
    this.setStrokeHue = function (value) {
        strokeHue = value;
    }
    var strokeSaturation = 0;
    this.getStrokeSaturation = function () {
        return strokeSaturation;
    }
    this.setStrokeSaturation = function (value) {
        strokeSaturation = value;
    }
    var strokeSecondaryColor = 0;
    this.getStrokeSecondaryColor = function () {
        return strokeSecondaryColor;
    }
    this.setStrokeSecondaryColor = function (value) {
        strokeSecondaryColor = value;
    }
    var pressureHue = 0;
    this.getPressureHue = function () {
        return pressureHue;
    }
    this.setPressureHue = function (value) {
        pressureHue = value;
    }
    var pressureSaturation = 0;
    this.getPressureSaturation = function () {
        return pressureSaturation;
    }
    this.setPressureSaturation = function (value) {
        pressureSaturation = value;
    }
    var pressureSecondaryColor = 0;
    this.getPressureSecondaryColor = function () {
        return pressureSecondaryColor;
    }
    this.setPressureSecondaryColor = function (value) {
        pressureSecondaryColor = value;
    }
    //rendering mode
    var blendingGlaze = 0;
    this.getBlendingGlaze = function () {
        return blendingGlaze;
    }
    this.setBlendingGlaze = function (value) {
        blendingGlaze = value;
    }
    var blendingIntenseGlaze = 0;
    this.getBlendingIntenseGlaze = function () {
        return blendingIntenseGlaze;
    }
    this.setBlendingIntenseGlaze = function (value) {
        blendingIntenseGlaze = value;
    }
    var blendingBlend = 0;
    this.getBlendingBlend = function () {
        return blendingBlend;
    }
    this.setBlendingBlend = function (value) {
        blendingBlend = value;
    }
    var blendingIntenseBlend = 0;
    this.getBlendingIntenseBlend = function () {
        return blendingIntenseBlend;
    }
    this.setBlendingIntenseBlend = function (value) {
        blendingIntenseBlend = value;
    }
    var blendingFlow = 0;
    this.getBlendingFlow = function () {
        return blendingFlow;
    }
    this.setBlendingFlow = function (value) {
        blendingFlow = value;
        this.setImage(orgimage);
    }
    var blendingLuminance = 0;
    this.getBlendingLuminance = function () {
        return blendingLuminance;
    }
    this.setBlendingLuminance = function (value) {
        blendingLuminance = value;
    }
    var blendMode = "source-over";
    this.getBlendMode = function () {
        return blendMode;
    }
    this.setBlendMode = function (value) {
        blendMode = value;
    }
    var bsize = 1, bpercent = 0.35;
    this.getSize = function () {
        return bsize;
    }
    this.setSize = function (value) {
        if (value != -1)
            bpercent = value;
        bsize = (dynamicBrushMaxSize * 300 + dynamicBrushMinSize * 10) * bpercent;
        if (bsize < 2)
            bsize = 2;
        transformedImageIsDirty = true;
    }
    var flow = 1;
    this.getFlow = function() {
        return flow;
    }
    this.setFlow = function(value) {
        flow = dynamicBrushMaxOpacity * value + dynamicBrushMinOpacity * 0.5;
        if (flow > 1)
            flow = 1;
        transformedImageIsDirty = true;
    }
    var image = null, orgimage = null;
    var brushContext = null;
    var shapeImageData = null;
    var transformedImage = null;
    var transformedImageIsDirty = true;
    var imageRatio = 1;
    this.getImage = function () {
        return image;
    }
    this.setImage = function (value) {
        if (value == null) {
            transformedImage = image = null;
            imageRatio = 1;
            drawFunction = drawCircle;
        }
        else if (value != image) {
            orgimage = image = value;
            imageRatio = image.height / image.width;
            transformedImage = document.createElement('canvas');
            brushContext = transformedImage.getContext('2d', { willReadFrequently : true });
            drawFunction = drawImage;
            transformedImageIsDirty = true;
            //venus = make blackwhite image to alpha image
            try
            {
                var tempCanvas = new OffscreenCanvas(image.width, image.height);
                const tempContext = tempCanvas.getContext("2d", { willReadFrequently: true });
                tempContext.drawImage(image, 0, 0);
                shapeImageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                var pixelData = shapeImageData.data;
                for (var i = 0; i < pixelData.length; i += 4) {
                    pixelData[i + 3] = pixelData[i] * blendingFlow;
                    if (pixelData[i] <= ((1 - blendingFlow) * 255))
                        pixelData[i + 3] = 0;
                    pixelData[i] = pixelData[i + 1] = pixelData[i + 2] = 255;
                }
                tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempContext.putImageData(shapeImageData, 0, 0);
                image = tempCanvas;
            }
            catch(e)
            {
                var tempCanvas = document.createElement('canvas');
                tempCanvas.width = image.width;
                tempCanvas.height = image.height;
                const tempContext = tempCanvas.getContext("2d", { willReadFrequently: true });
                tempContext.drawImage(image, 0, 0);
                shapeImageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                var pixelData = shapeImageData.data;
                for (var i = 0; i < pixelData.length; i += 4) {
                    pixelData[i + 3] = pixelData[i] * blendingFlow;
                    if (pixelData[i] <= ((1 - blendingFlow) * 255))
                        pixelData[i + 3] = 0;
                    pixelData[i] = pixelData[i + 1] = pixelData[i + 2] = 255;
                }
                tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempContext.putImageData(shapeImageData, 0, 0);
                image = new Image();
                image.src = tempCanvas.toDataURL();
            }
        }
    }
    this.getBrushContext = function() {
        return brushContext;
    }
    var brushPattern = null, bpWidth, bpHeight;
    this.setPattern = function(pattern, w, h) {
        brushPattern = pattern;
        bpWidth = w;
        bpHeight = h;
    }

    var delta = 0;
    var prevX = 0;
    var prevY = 0;
    var lastX = 0;
    var lastY = 0;
    var dir = 0;
    var spCurScale = 1;
    var spPrevScale = 1;
    var spCurOpacity = 1;
    var spPrevOpacity = 1;
    var prevScale = 0;
    var drawFunction = drawCircle;
    var reserved = null;
    var dirtyRect;
    function spreadRandom() {
        return random() - 0.5;
    }
    function drawReserved() {
        if (reserved != null) {
            drawTo(reserved.x, reserved.y, reserved.scale, 0, 0);
            reserved = null;
        }
    }

    function appendDirtyRect(x, y, width, height) {
        if (!(width && height))
            return;
        var dxw = dirtyRect.x + dirtyRect.width;
        var dyh = dirtyRect.y + dirtyRect.height;
        var xw = x + width;
        var yh = y + height;
        var minX = dirtyRect.width ? min(dirtyRect.x, x) : x;
        var minY = dirtyRect.height ? min(dirtyRect.y, y) : y;
        dirtyRect.x = minX;
        dirtyRect.y = minY;
        dirtyRect.width = max(dxw, xw) - minX;
        dirtyRect.height = max(dyh, yh) - minY;
    }

    function drawTo(x, y, scale, pressure, azimuthAngle) {
        if ((dynamicSpeedSize != 0 || shapeRotation != 0) && !drawflag)
        {
            drawflag = true;
            return;
        }
        var scaledSize = bsize * scale;
        var nrm = dir + QUARTER;
        var nr = normalSpread * scaledSize * spreadRandom();
        var tr = tangentSpread * scaledSize * spreadRandom();
        var ra = angle * toDeg;
        if (shapeAzimuth)
            ra = azimuthAngle * toDeg;
        else if (shapeScatter && !drawflag) {
            drawflag = true;
            ra = fabric.util.getRandom(shapeScatter);
        }
        else if (shapeRandomized) {
            ra = shapeRotation > 0 ? (360 * shapeRotation) : 360;
            ra = fabric.util.getRandom(ra, -ra);
        }
        else if (shapeRotation > 0) {
            ra += shapeRotation * dir * toDeg;
        }
        ra = ra * toRad;
        if (dynamicJitterSize > 0)
            scaledSize -= fabric.util.getRandom(dynamicJitterSize * scaledSize);
        if (grainEffect == 2 && patternCol.indexOf("none") == -1)
        {
            x = parseInt(x);
            y = parseInt(y);
            scaledSize = parseInt(scaledSize);
        }
        var width = scaledSize;
        var height = width * imageRatio;
        var boundWidth = abs(height * sin(ra)) + abs(width * cos(ra));
        var boundHeight = abs(width * sin(ra)) + abs(height * cos(ra));
        x += Math.cos(nrm) * nr + Math.cos(dir) * tr;
        y += Math.sin(nrm) * nr + Math.sin(dir) * tr;
        let cnt = shapeCount;
        if (shapeCountJitter > 0)
            cnt -= parseInt(fabric.util.getRandom(shapeCountJitter * shapeCount));
        if (grainEffect == 2 && patternCol.indexOf("none") == -1)
        {
            ra = 0;
        }
        for (let i = 0; i < cnt; i ++)
        {
            if (USE_BLEND_MODE)
            {
                oContext.save();
                oContext.translate(x, y);
                oContext.rotate(ra);
                oContext.scale(shapeFlipX ? -1 : 1, shapeFlipY ? -1 : 1);
                oContext.translate(-(width * 0.5), -(height * 0.5));
                drawImage(x, y, width, pressure);
                oContext.restore();
            }
            else
            {
                context.save();
                context.translate(x, y);
                context.rotate(ra);
                context.scale(shapeFlipX ? -1 : 1, shapeFlipY ? -1 : 1);
                context.translate(-(width * 0.5), -(height * 0.5));
                drawImage(x, y, width, pressure);
                context.restore();
            }
        }
        appendDirtyRect(x - (boundWidth * 0.5),
                        y - (boundHeight * 0.5),
                        boundWidth, boundHeight);
    }

    function drawImage(x, y, size, pressure) {
        if (transformedImageIsDirty)
            transformImage(x, y, size, pressure);
        try {
            if (grainEffect == 2 && patternCol.indexOf("none") == -1)
            {
                if (USE_BLEND_MODE)
                    oContext.clearRect(0, 0, size, size * imageRatio);
                else
                    context.clearRect(0, 0, size, size * imageRatio);
            }
            if (USE_BLEND_MODE)
            {
                oContext.drawImage(transformedImage, 0, 0, transformedImage.width, transformedImage.height, 0, 0, size, size * imageRatio);
                context.clearRect(0, 0, context.canvas.width, context.canvas.height);
                context.globalAlpha = 1;
                context.drawImage(freezeContext.canvas, 0, 0, freezeContext.canvas.width, freezeContext.canvas.height, 0, 0, context.canvas.offsetWidth, context.canvas.offsetHeight);
                if (blendingGlaze)
                    context.globalAlpha = 0.3;
                else if (blendingIntenseGlaze)
                    context.globalAlpha = 0.5;
                else if (blendingBlend)
                    context.globalAlpha = 0.8;
                else if (blendingIntenseBlend)
                    context.globalAlpha = 1;
                context.drawImage(oContext.canvas, 0, 0, oContext.canvas.width, oContext.canvas.height);
            }
            else
            {
                context.globalCompositeOperation = blendMode;
                context.drawImage(transformedImage, 0, 0, transformedImage.width, transformedImage.height, 0, 0, size, size * imageRatio);
            }
        }
        catch (e) {
            drawCircle(size);
        }
    }

    function transformImage(x, y, size, pressure) {
        let fcolor = color;
        let scolor = fabric.util.colorValues(secondarycolor);
        if (USE_ROUNDOUTLINER)
        {
            let t = fcolor;
            fcolor = scolor;
            scolor = t;
        }
        fcolor = RGBToHSB(fcolor[0], fcolor[1], fcolor[2]);
        transformedImage.width = bsize;
        transformedImage.height = bsize * imageRatio;
        brushContext.clearRect(0, 0, transformedImage.width, transformedImage.height);
        brushContext.drawImage(image, 0, 0, image.width, image.height, 0, 0, transformedImage.width, transformedImage.height);
        //venus add round outliner
        if (USE_ROUNDOUTLINER)
        {
            context.globalCompositeOperation = "destination-over";
            brushContext.globalCompositeOperation = 'source-in';
            brushContext.fillStyle = 'rgb(' + scolor[0] + ',' + scolor[1] + ',' + scolor[2] + ')';
            brushContext.fillRect(0, 0, transformedImage.width, transformedImage.height);
            context.drawImage(transformedImage, 0, 0, transformedImage.width, transformedImage.height, -size * (ROUNDOUTLINER_STROKE * 0.5), -size * imageRatio * (ROUNDOUTLINER_STROKE * 0.5), size * (1 + ROUNDOUTLINER_STROKE), size * imageRatio * (1 + ROUNDOUTLINER_STROKE));
        }
        //////////////////////////
        if (grainEffect == 2 && patternCol.indexOf("none") == -1)
        {
            shapePreviewContext.drawImage(transformedImage, 0, 0, transformedImage.width, transformedImage.height, x - transformedImage.width * 0.5, y - transformedImage.height * 0.5, transformedImage.width, transformedImage.height);
            var tmpdata = shapePreviewContext.getImageData(x - transformedImage.width * 0.5, y - transformedImage.height * 0.5, transformedImage.width, transformedImage.height);
            brushContext.putImageData(tmpdata, 0, 0);
        }
        if (grainEffect > 0 && patternCol.indexOf("none") == -1)
        {
            var matrix = new DOMMatrix([1, 0, 0, 1, 0, 0]);
            if (grainEffect == 1) //moving
            {
                let v = bsize / bpWidth;
                let bpscale = grainMoveScale * (v + (1 - v) * grainMoveZoom);
                let tx = -x * grainMovement + transformedImage.width * 0.5, ty = -y * grainMovement + transformedImage.height * 0.5;
                if (grainMoveOffsetJitter)
                {
                    tx += grainMoveOffsetJitterVal;
                    ty += grainMoveOffsetJitterVal;
                }
                brushPattern.setTransform(matrix.translate(tx, ty).rotate(grainMoveRotation).scale(bpscale, bpscale));
            }
            else //texturized
            {
                let tx = -x + transformedImage.width * 0.5, ty = -y + transformedImage.height * 0.5;
                tx += grainMoveOffsetJitterVal;
                ty += grainMoveOffsetJitterVal;
                brushPattern.setTransform(matrix.translate(tx, ty).scale(grainTexScale, grainTexScale));
            }
            brushContext.fillStyle = brushPattern;
        }
        brushContext.globalCompositeOperation = 'source-in';
        brushContext.fillRect(0, 0, transformedImage.width, transformedImage.height);
        if (pressureHue != 0 || pressureSaturation != 0 || pressureSecondaryColor != 0)
        {
            fcolor[0] += pressure * pressureHue * 360;
            fcolor[1] += pressure * pressureSaturation * 100;
            if (fcolor[0] > 360)
                fcolor[0] = 720 - fcolor[0];
            if (fcolor[0] < 0)
                fcolor[0] = -fcolor[0];
            if (fcolor[1] > 100)
                fcolor[1] = 200 - fcolor[1];
            if (fcolor[1] < 0)
                fcolor[1] = -fcolor[1];
            fcolor = HSBToRGB(fcolor[0], fcolor[1], fcolor[2]);
            let p = pressure * pressureSecondaryColor;
            fcolor[0] = fcolor[0] * (1 - p ) + scolor[0] * p;
            fcolor[1] = fcolor[1] * (1 - p) + scolor[1] * p;
            fcolor[2] = fcolor[2] * (1 - p) + scolor[2] * p;
        }
        else
        {
            fcolor[0] += fabric.util.getRandom(stampHue * 360);
            fcolor[1] += fabric.util.getRandom(stampSaturation * 100);
            if (fcolor[0] > 360)
                fcolor[0] = 720 - fcolor[0];
            if (fcolor[1] > 100)
                fcolor[1] = 200 - fcolor[1];
            fcolor = HSBToRGB(fcolor[0], fcolor[1], fcolor[2]);
            let r = stampSecondaryColor > 0 ? fabric.util.getRandom(stampSecondaryColor, 0) :  stampSecondaryColor;
            fcolor[0] = fcolor[0] * (1 - r) + scolor[0] * r;
            fcolor[1] = fcolor[1] * (1 - r) + scolor[1] * r;
            fcolor[2] = fcolor[2] * (1 - r) + scolor[2] * r;
        }
        brushContext.fillStyle = 'rgb(' + fcolor[0] + ',' + fcolor[1] + ',' + fcolor[2] + ')';
        brushContext.fillRect(0, 0, transformedImage.width, transformedImage.height);
        // let imgData = brushContext.getImageData(0, 0, transformedImage.width, transformedImage.height);
        // let pixelData = imgData.data;
        // for (var i = 0; i < pixelData.length; i += 4) {
        //     pixelData[i] = fcolor[0];
        //     pixelData[i + 1] = fcolor[1];
        //     pixelData[i + 2] = fcolor[2];
        // }
        // brushContext.putImageData(imgData, 0, 0, 0, 0, transformedImage.width, transformedImage.height);
    }

    function drawCircle(size) {
        var halfSize = size * 0.5;
        context.fillStyle = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
        context.globalAlpha = flow;
        context.beginPath();
        context.arc(halfSize, halfSize, halfSize, 0, ONE);
        context.closePath();
        context.fill();
    }

    this.down = function(x, y, pressure, azimuthAngle) {
        var scale = 1;
        if (context == null)
            throw 'brush needs the context';
        // at the start of a stroke clear the offscreen canvas
        if (USE_BLEND_MODE)
            oContext.clearRect(0, 0, oContext.canvas.width, oContext.canvas.height);
        dir = 0;
        dirtyRect = {x: 0, y: 0, width: 0, height: 0};
        if (grainMoveOffsetJitter)
        {
            grainMoveOffsetJitterVal = fabric.util.getRandom(bpWidth);
        }
        context.globalCompositeOperation = blendMode;
        if (USE_BLEND_MODE)
            oContext.globalCompositeOperation = blendMode;
        //stroke color dynamic
        color = fabric.util.colorValues(firstcolor);
        let scolor = fabric.util.colorValues(secondarycolor);
        color = RGBToHSB(color[0], color[1], color[2]);
        // if (pressureHue != 0 || pressureSaturation != 0 || pressureSecondaryColor != 0)
        // {
            
        // }
        // else
        {
            color[0] += fabric.util.getRandom(strokeHue * 360);
            color[1] += fabric.util.getRandom(strokeSaturation * 100);
            if (color[0] > 360)
                color[0] = 720 - color[0];
            if (color[1] > 100)
                color[1] = 200 - color[1];
            color = HSBToRGB(color[0], color[1], color[2]);
            let r = strokeSecondaryColor > 0 ? fabric.util.getRandom(strokeSecondaryColor, 0) : 0;
            color[0] = color[0] * (1 - r) + scolor[0] * r;
            color[1] = color[1] * (1 - r) + scolor[1] * r;
            color[2] = color[2] * (1 - r) + scolor[2] * r;
        }
        //////////////////////
        spCurScale = spPrevScale = 1 + Math.min(dynamicSpeedSize, 0);
        spCurOpacity = spPrevOpacity = 1 + Math.min(dynamicSpeedOpacity, 0);
        if (scale > 0) {
            if (normalSpread != 0 || tangentSpread != 0)
                reserved = {x: x, y: y, scale: scale};
            else
            {
                if (USE_BLEND_MODE)
                    oContext.globalAlpha = flow * spPrevOpacity;
                else
                    context.globalAlpha = flow * spPrevOpacity;
                drawTo(x, y, scale, pressure, azimuthAngle);
            }
        }
        delta = 0;
        lastX = prevX = x;
        lastY = prevY = y;
        prevScale = scale;
    }

    this.move = function(x, y, pressure, azimuthAngle) {
        var scale = 1;
        if (context == null)
            throw 'brush needs the context';
        if (scale <= 0) {
            delta = 0;
            prevX = x;
            prevY = y;
            prevScale = scale;
            return;
        }
        var dx = x - prevX;
        var dy = y - prevY;
        var ds = scale - prevScale;
        var d = sqrt(dx * dx + dy * dy);
        prevX = x;
        prevY = y;
        delta += d;
        var midScale = (prevScale + scale) * 0.5;
        var drawSpacing = bsize * spacing * midScale;
        var ldx = x - lastX;
        var ldy = y - lastY;
        var ld = sqrt(ldx * ldx + ldy * ldy);
        dir = atan2(ldy, ldx);
        if ((ldx || ldy))
            drawReserved();
        if (drawSpacing < 0.5)
            drawSpacing = 0.5;
        if (delta < drawSpacing) {
            prevScale = scale;
            return;
        }
        var scaleSpacing = ds * (drawSpacing / delta);
        //venus add start
        let spScaleSpacing = 0, spOpacitySpacing = 0;
        let speed = delta / drawSpacing;
        if (dynamicSpeedSize != 0) {
            spCurScale = (1 + Math.min(dynamicSpeedSize, 0)) - (speed * 0.1 * dynamicSpeedSize);
            spCurScale = Math.min(1, Math.max(0.1, spCurScale));
            spCurScale = spPrevScale * 0.7 + spCurScale * 0.3;
            ds = spCurScale - spPrevScale;
            spScaleSpacing = ds * (drawSpacing / delta);
        }
        if (dynamicSpeedOpacity != 0) {
            spCurOpacity = (1 + Math.min(dynamicSpeedOpacity, 0)) - (speed * 0.1 * dynamicSpeedOpacity);
            spCurOpacity = Math.min(1, Math.max(0.1, spCurOpacity));
            spCurOpacity = spPrevOpacity * 0.7 + spCurOpacity * 0.3;
            ds = spCurOpacity - spPrevOpacity;
            spOpacitySpacing = ds * (drawSpacing / delta);
        }
        //venus add end
        if (ld < drawSpacing) {
            lastX = x;
            lastY = y;
            drawTo(lastX, lastY, spCurScale, pressure, azimuthAngle);
            delta -= drawSpacing;
        } else {
            while(delta >= drawSpacing) {
                let opacity = flow;
                if (dynamicJitterOpacity > 0)
                    opacity -= fabric.util.getRandom(dynamicJitterOpacity * opacity, 0);
                ldx = x - lastX;
                ldy = y - lastY;
                var tx = cos(dir);
                var ty = sin(dir);
                lastX += tx * drawSpacing;
                lastY += ty * drawSpacing;
                prevScale += scaleSpacing;
                spPrevScale += spScaleSpacing;
                spPrevOpacity += spOpacitySpacing;
                if (USE_BLEND_MODE)
                    oContext.globalAlpha = opacity * spPrevOpacity;
                else
                    context.globalAlpha = opacity * spPrevOpacity;
                if (flow > 0)
                {
                    drawTo(lastX, lastY, spPrevScale, pressure, azimuthAngle);
                    flow -= fallOff * spacing / 5;
                    if (flow < 0)
                        flow = 0;
                }
                delta -= drawSpacing;
            }
        }
        prevScale = scale;
    }
    this.up = function (x, y, pressure, azimuthAngle) {
        var scale = 1;
        dir = atan2(y - lastY, x - lastX);
        drawReserved();
        shapePreviewContext.clearRect(0, 0, shapePreviewContext.canvas.width, shapePreviewContext.canvas.height);
        if (USE_BLEND_MODE)
        {
            freezeContext.clearRect(0, 0, freezeContext.canvas.width, freezeContext.canvas.height);
            freezeContext.drawImage(context.canvas, 0, 0);
        }
        drawflag = false;
        return dirtyRect;
    }

    function cloneContext(oldContext) {
        try
        {
            //create a new canvas
            var newCanvas = new OffscreenCanvas(oldContext.canvas.width, oldContext.canvas.height);
            var context = newCanvas.getContext('2d', {willReadFrequently: true});
            //return the new context
            return context;
        }
        catch(e)
        {
            //create a new canvas
            var newCanvas = document.createElement('canvas');
            var context = newCanvas.getContext('2d', {willReadFrequently: true});
            //set dimensions
            newCanvas.width = oldContext.canvas.width;
            newCanvas.height = oldContext.canvas.height;
            //return the new context
            return context;
        }
    }
}
