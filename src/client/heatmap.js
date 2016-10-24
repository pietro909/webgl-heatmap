function loadData(url, onProgress, onLoaded) {
    'use strict';

    var myRequest, tStart = new Date(),
        uiFileTime = document.getElementById('fileTime'),
        uiFileSize = document.getElementById('fileSize');


    myRequest = new XMLHttpRequest();

    myRequest.addEventListener(
        'loadend',
        function(event) {
            var json = JSON.parse(event.target.response);
            var response = json.map(function(s) {
                var p = s.split(',');
                return {
                    lat: p[0],
                    lon: p[1],
                    uptime: parseFloat(p[2]),
                    downtime: parseFloat(p[3]),
                    link: parseFloat(p[4])
                };
            });
            onLoaded(response);
            var size = Math.floor((event.loaded/1000000)*10)/10;
            uiFileSize.textContent = size;
            uiFileTime.textContent = ((new Date()) - tStart) / 1000;
        }
    );

    myRequest.addEventListener(
        'progress',
        function(event) {
            var percentage = Math.floor(event.loaded * 100 / event.total);
            onProgress(percentage);
        }
    );

    myRequest.open('GET', url, true);
    myRequest.send();

}



var map, view;

var onLoad = function() {
    'use strict';

    var canvas, renderer, stage, container, gl, program,
        bufferId, vPosition,
        u_viewMinX, u_viewMaxX, u_viewMinY, u_viewMaxY,
        vUplink, vDownlink, vPmkpi,
        tRun, tEnd,
        points = [],
        allVertices = [],
        OpenLayers = ol,
        url = '/data',
        pointSize = 5,
        center = ol.proj.fromLonLat([12.457933, 41.902192]),
        changeMarker = document.getElementById('changeMarker'),
        canvas = document.getElementById('theCanvas');

    var uiPoints = document.getElementById('points'),
        uiDrawTime = document.getElementById('drawTime'),
        uiLoadingPercent = document.getElementById('loadPercent');

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

        uiPoints.textContent = vertices.length / pointSize;
        uiDrawTime.textContent = (tEnd - tRun) / 1000;

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

    function fetch() {
        loadData(
            url,
            function(percentage) {
                uiLoadingPercent.textContent = percentage + '%';
                uiLoadingPercent.parentNode.className = "text-danger";
            },
            function(data) {
                var extents = updateMapSize();
                var vertices = parseData(data, extents);
                drawData(vertices);

                uiLoadingPercent.parentNode.className = "";
                setTimeout(fetch, 4000);

            }
        );
    }

    fetch();

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
