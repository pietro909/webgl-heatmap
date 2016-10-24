function loadData(url, onProgress, onLoaded) {
    'use strict';

    var myRequest;

    myRequest = new XMLHttpRequest();

    myRequest.addEventListener(
        'loadend',
        function(event) {
            var response = event.target.response;
            try {
                var theDocument = JSON.parse(response);
                onLoaded(theDocument);
            } catch(e) {
                console.log(e);
                console.log(response);
            }
        }
    );

    myRequest.addEventListener(
        'progress',
        function(event) {
            //console.log(event);
            // var percentage = Math.floor(event.loaded * 100 / event.total);
            // onProgress(percentage);
        }
    );

    myRequest.open('GET', url, true);
    myRequest.send();

}


var tRun, tEnd, tStart = new Date();

var map, view;

var onLoad = function() {
    'use strict';

    var canvas, renderer, stage, container, gl, program,
        bufferId, vPosition, /*vColor,*/
        u_viewMinX, u_viewMaxX, u_viewMinY, u_viewMaxY,
        vUplink, vDownlink, vPmkpi,
        points = [],
        allVertices = [],
        OpenLayers = ol,
        url = '/data',
        pointSize = 5, //9,
        center = ol.proj.fromLonLat([12.457933, 41.902192]),
        changeMarker = document.getElementById('changeMarker'),
        canvas = document.getElementById('theCanvas');

    // init context
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert('WebGL is not available');
        return;
    }

    // load shaders 
    program = initShaders(gl,
        '/src/client/vShader-heatmap.glsl',
        '/src/client/fShader-heatmap.glsl'
    );

    gl.useProgram(program);

    /** WebGL declarations **/

    // associate out shader variables with our data buffer
    bufferId = gl.createBuffer();
    vPosition = gl.getAttribLocation(program, 'vPosition');

    u_viewMinX = gl.getUniformLocation(program, 'u_viewMinX');
    u_viewMaxX = gl.getUniformLocation(program, 'u_viewMaxX');
    u_viewMinY = gl.getUniformLocation(program, 'u_viewMinY');
    u_viewMaxY = gl.getUniformLocation(program, 'u_viewMaxY');

    vUplink = gl.getAttribLocation(program, 'vUplink');
    vDownlink = gl.getAttribLocation(program, 'vDownlink');
    vPmkpi = gl.getAttribLocation(program, 'vPmkpi');

    function parseData(data, extents) {
        var k, currentPoint, p, pointArray = [];

        tRun = new Date();

        for (var i = 0; i < data.length; i += 1) {
            k = i * 2;
            currentPoint = data[i];

            if (p !== null) {
                // two bytes position
                pointArray.push(currentPoint.lon);
                pointArray.push(currentPoint.lat);
                // four bytes base color
                /*
                pointArray.push(1.0);
                pointArray.push(0.0);
                pointArray.push(0.0);
                pointArray.push(1.0);
                */
                // point attributes: 
                pointArray.push(currentPoint.uptime);
                pointArray.push(currentPoint.downtime);
                pointArray.push(currentPoint.link);
            }

        }
        return (new Float32Array(pointArray));
    }

    function drawData(vertices) {
        var stride, step;

        stride = pointSize * Float32Array.BYTES_PER_ELEMENT;
        step = Float32Array.BYTES_PER_ELEMENT;

        allVertices = vertices;

        // configure webgl
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);

        // load data into the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // associate out shader variables with our data buffer
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(vPosition);

        //gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, stride, 2 * step);
        //gl.enableVertexAttribArray(vColor);

        gl.vertexAttribPointer(vUplink, 1, gl.FLOAT, false, stride, 2 *
            step);
        gl.enableVertexAttribArray(vUplink);

        gl.vertexAttribPointer(vDownlink, 1, gl.FLOAT, false, stride, 3 *
            step);
        gl.enableVertexAttribArray(vDownlink);

        gl.vertexAttribPointer(vPmkpi, 1, gl.FLOAT, false, stride, 4 * step);
        gl.enableVertexAttribArray(vPmkpi);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, vertices.length / pointSize);

        tEnd = new Date();
        var elaborationTime = (tEnd - tRun) / 1000;
        var message = 'Displaying ' + (vertices.length / pointSize) +
            ' points. Parsed in ' + elaborationTime + ' seconds.';
        console.log(message);
        document.getElementById('vertices').textContent = message;

    }

    function updateMapSize() {
        var bounds, extent;

        bounds = map.getView().calculateExtent(map.getSize());
        extent = ol.proj.transformExtent(bounds, 'EPSG:3857', 'EPSG:4326');

        gl.uniform1f(u_viewMinX, [extent[0]]);
        gl.uniform1f(u_viewMinY, [extent[1]]);
        gl.uniform1f(u_viewMaxX, [extent[2]]);
        gl.uniform1f(u_viewMaxY, [extent[3]]);

        return extent;
    }

    // load and process file
    setInterval(function() {
    loadData(
        url,
        function(percentage) {
            console.log('loaded: ' + percentage + '%');
        },
        function(data) {
            var extents = updateMapSize();
            var vertices = parseData(data, extents);

            drawData(vertices);

        }
    );
    }, 4000);


    map = new OpenLayers.Map({
        projection: 'EPSG:4326',
        layers: [
            new OpenLayers.layer.Tile({
                source: new OpenLayers.source.OSM()
            })
        ],
        target: 'theMap',
        controls: OpenLayers.control.defaults({
            attributionOptions: ({
                collapsible: false
            })
        }),
        view: new OpenLayers.View({
            center: center,
            zoom: 6
        })
    });

    view = map.getView();

    map.addEventListener(
        'moveend',
        function(event) {

            var extents = updateMapSize();

            updateMapSize();

            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, allVertices.length / pointSize);
        }
    );

}
