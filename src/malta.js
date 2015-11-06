var map, view;
var onLoad = function()
{
  'use strict';

    var
        canvas, renderer, stage, container, gl, points,
        OpenLayers = ol,
    //35°53'21.1"N 14°30'41.3"E -> inverted!!!
    //35.898440, 14.495511
    malta = [ 14.495511, 35.898440 ];

    canvas = document.getElementById( 'theCanvas' );

    // init context
    gl = WebGLUtils.setupWebGL( canvas );
   
    if (!gl)
    {
        alert('WebGL is not available');
        return;
    }

    var program = initShaders( gl,
                               '/src/vShader-malta.glsl',
                               '/src/fShader-malta.glsl'
                             );

    gl.useProgram( program );

    /** WebGL declarations **/
        
    // associate out shader variables with our data buffer
    var bufferId = gl.createBuffer();
    var vPosition = gl.getAttribLocation( program, 'vPosition' );
    var vColor = gl.getAttribLocation( program, 'vColor' );
    var u_viewMinX = gl.getUniformLocation( program, 'u_viewMinX' );
    var u_viewMaxX = gl.getUniformLocation( program, 'u_viewMaxX' );
    var u_viewMinY = gl.getUniformLocation( program, 'u_viewMinY' );
    var u_viewMaxY = gl.getUniformLocation( program, 'u_viewMaxY' );

    function updateMapSize()
    {
        var bounds = map.getView().calculateExtent( map.getSize() );
        var extent = ol.proj.transformExtent(bounds, 'EPSG:3857', 'EPSG:4326');
        gl.uniform1f( u_viewMinX, extent[ 0 ] );
        gl.uniform1f( u_viewMinY, [ extent[ 1 ] ] );
        gl.uniform1f( u_viewMaxX, [ extent[ 2 ] ] );
        gl.uniform1f( u_viewMaxY, [ extent[ 3 ] ] );
    }

    function drawData( vertices )
    {

        // configure webgl
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        
        // load data into the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // associate out shader variables with our data buffer
        gl.vertexAttribPointer( vPosition,
                                2,
                                gl.FLOAT,
                                false,
                                0, //2 * Float32Array.BYTES_PER_ELEMENT,
                                0
                              );
        
        gl.enableVertexAttribArray(vPosition);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays( gl.POINTS, 0, 1 );
        
    }

    function translatePoint( point )
    {

        // from http://stackoverflow.com/questions/28166471/openlayer3-how-to-get-coordinates-of-viewport
        var bounds = map.getView().calculateExtent(map.getSize())
        var extent = ol.proj.transformExtent(bounds, 'EPSG:3857', 'EPSG:4326');
        var canvasSize = map.getSize();
        var mapWidth = ( extent[ 2 ] - extent[ 0 ] );
        var mapHeight = ( extent[ 3 ] - extent[ 1 ] );
        var webgl_x = ( (point[0] - extent[0]) / mapWidth * 2) - 1;
        var webgl_y = ( (point[1] - extent[1]) / mapHeight * 2) - 1;

        var result = [
            webgl_x,
            webgl_y,
            0,
            1
        ];
        return result;

    }
    
    var maltaWebMercator = ol.proj.fromLonLat(malta);

    map = new OpenLayers.Map({
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
            center: maltaWebMercator,
            zoom: 16
            
        })
    });

    view = map.getView();

    map.on(
        'moveend',
        function( event )
        {
            updateMapSize();
            drawData( new Float32Array( thePoint ) );
        }
    );

    var thePoint = [ 0.0, 0.0 ];
    var inputTxt = document.getElementById('myCoords');
    var button = document.getElementById('findBtn');
    button.addEventListener(
        'click',
        function( evt )
        {
            updateMapSize();

            var c = inputTxt.value.split(',');
            var point = [
                parseFloat( c[0] ),
                parseFloat( c[1] )
            ];
            var toDraw = point; //translatePoint( point );
            console.log(point[0]+' => '+toDraw[0]);
            drawData( new Float32Array( toDraw ) );
            console.log(point[1]+' => '+toDraw[1]);
            thePoint = point;
        }
    );
    
}
