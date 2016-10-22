var bounds = {
  DOWNLINK : {
    min: 0,
    max: 0
  },
  UPLINK : {
    min: 0,
    max: 0
  },
  PMKPI : {
    min: 0,
    max: 0
  }
}

function loadData( url, onProgress, onLoaded )
{
  'use strict';

  var myRequest;

  myRequest = new XMLHttpRequest();

  myRequest.addEventListener(
    'loadend',
    function( event )
    {
        var row, value, parsed, key, theDocument = [], currentDoc = {}, 
          data = event.target.response,
          all_rows = data.split( '\n' ),
          rows = all_rows.slice( 1, all_rows.length - 1 ),
          headers = all_rows[0].split( ';' );

      for (var i = 0; i < rows.length; i += 1)
      {
        row = rows[ i ].split( ';' );
        for (var h = 0; h < headers.length; h += 1)
          {
              key = headers[ h ];
              value = row[ h ];
              
              switch (key)
              {
                  case 'DOWNLINK':
                  parsed = parseInt( value, 10 );
                  currentDoc[ key ] = parsed;
                  if ( bounds.DOWNLINK.min > parsed )
                  {
                      bounds.DOWNLINK.min = parsed; 
                  }
                  if ( bounds.DOWNLINK.max < parsed ) 
                  {
                    bounds.DOWNLINK.max = parsed; 
                  }
                  break;
                  case 'UPLINK':
                  parsed = parseInt( value, 10 );
                  currentDoc[ key ] = parsed;
                  if ( bounds.UPLINK.min > parsed )
                  {
                      bounds.UPLINK.min = parsed; 
                  }
                  if ( bounds.UPLINK.max < parsed ) 
                  {
                    bounds.UPLINK.max = parsed; 
                  }
                  break;
                  case 'LON':
                  currentDoc[ key ] = parseFloat( value );
                  break;
                  case 'LAT':
                  currentDoc[ key ] = parseFloat( value );
                  break;
                  case 'PM-KPI':
                  parsed = parseInt( value, 10 );
                  currentDoc[ 'PM_KPI' ] = parsed;
                  if ( bounds.PMKPI.min > parsed )
                  {
                      bounds.PMKPI.min = parsed; 
                  }
                  if ( bounds.PMKPI.max < parsed ) 
                  {
                    bounds.PMKPI.max = parsed; 
                  }
                  break;
                  default:
                  currentDoc[ key ] = value ;
                  break;
              }
        }

        theDocument.push( currentDoc );
        currentDoc = {};
      }

      onLoaded( theDocument );

    }
  );

  myRequest.addEventListener(
    'progress',
    function( event )
    {
      var percentage = Math.floor( event.loaded * 100 / event.total );
      onProgress( percentage );
    }
  );

  myRequest.open( 'GET', url, true );
  myRequest.send();
  
}


var tRun, tEnd, tStart = new Date();

var map, view;

var onLoad = function()
{
    'use strict';

    var canvas, renderer, stage, container, gl, program,
        bufferId, vPosition, vColor,
        u_viewMinX, u_viewMaxX, u_viewMinY, u_viewMaxY,
        vUplink, u_UpLinkMax, vDownlink, u_DownLinkMax, vPmkpi, u_PmKpiMax,
        u_marker, u_coord_multiplier,
        points = [],
        allVertices = [],
        OpenLayers = ol,
//      url = '/assets/data/fake-data-1-rop-trunc.csv';
        url = '/assets/data/random-numbers.csv',
        pointSize = 9,
        center = ol.proj.fromLonLat( [ 12.457933, 41.902192 ] ),
        changeMarker = document.getElementById('changeMarker'),
        canvas = document.getElementById( 'theCanvas' ),
        COORD_MULT = 1.0;

    // init context
    gl = WebGLUtils.setupWebGL( canvas );
   
    if (!gl)
    {
        alert('WebGL is not available');
        return;
    }

    // load shaders 
    program = initShaders( gl,
                           '/src/vShader-heatmap.glsl',
                           '/src/fShader-heatmap.glsl'
                         );
    
    gl.useProgram(program);

    /** WebGL declarations **/
        
    // associate out shader variables with our data buffer
    bufferId = gl.createBuffer();
    vPosition = gl.getAttribLocation( program, 'vPosition' );
    vColor = gl.getAttribLocation( program, 'vColor' );
    
    u_viewMinX = gl.getUniformLocation( program, 'u_viewMinX' );
    u_viewMaxX = gl.getUniformLocation( program, 'u_viewMaxX' );
    u_viewMinY = gl.getUniformLocation( program, 'u_viewMinY' );
    u_viewMaxY = gl.getUniformLocation( program, 'u_viewMaxY' );

    vUplink = gl.getAttribLocation( program, 'vUplink' );
    u_UpLinkMax = gl.getUniformLocation( program, 'u_UpLinkMax' );
    vDownlink = gl.getAttribLocation( program, 'vDownlink');
    u_DownLinkMax = gl.getUniformLocation( program, 'u_DownLinkMax' );
    vPmkpi = gl.getAttribLocation( program, 'vPmkpi');
    u_PmKpiMax = gl.getUniformLocation( program, 'u_PmKpiMax' );
    
    u_marker = gl.getUniformLocation( program, 'u_marker' );
    u_coord_multiplier = gl.getUniformLocation( program, 'u_coord_multiplier' );
    
    function parseData( data, extents )
    {
        var k, currentPoint,p,  pointArray=[];

        tRun = new Date();

        for ( var i = 0; i < data.length; i += 1 )
        {
            k = i * 2;
            currentPoint = data[ i ];
            
            if ( p !== null )
            {
                // two bytes position
                pointArray.push( currentPoint.LON * COORD_MULT );
                pointArray.push( currentPoint.LAT * COORD_MULT );
                // four bytes baser color
                pointArray.push( 1.0 );
                pointArray.push( 0.0 );
                pointArray.push( 0.0 );
                pointArray.push( 1.0 );
                // point attributes: 
                pointArray.push( currentPoint.UPLINK );
                pointArray.push( currentPoint.DOWNLINK );
                pointArray.push( currentPoint.PM_KPI ); 
            }
            
        }
        return( new Float32Array( pointArray ) );
    }

    function coordsToCanvas( point, extents )
    {
        var x = ( ( point[0] - extents[0] ) / ( extents[2] - extents[0] ) * 2.0 ) - 1.0;
        var y = ( ( point[1] - extents[1] ) / ( extents[3] - extents[1] ) * 2.0 ) - 1.0;
        return [ x, y ];
    }
  
    function drawData( vertices, marker )
    {
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

        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, stride, 2 * step);
        gl.enableVertexAttribArray(vColor);

        gl.vertexAttribPointer(vUplink, 1, gl.FLOAT, false, stride, 6 * step);
        gl.enableVertexAttribArray(vUplink);

        gl.uniform1fv( u_UpLinkMax, [ bounds.UPLINK.max ] );

        gl.vertexAttribPointer(vDownlink, 1, gl.FLOAT, false, stride, 7 * step);
        gl.enableVertexAttribArray(vDownlink);

        gl.uniform1fv( u_DownLinkMax, [ bounds.DOWNLINK.max ] );

        gl.vertexAttribPointer(vPmkpi, 1, gl.FLOAT, false, stride, 8 * step);
        gl.enableVertexAttribArray(vPmkpi);

        gl.uniform1fv( u_PmKpiMax, [ bounds.PMKPI.max ] );

        gl.uniform1i( u_marker, [ marker ] );
        gl.uniform1f( u_coord_multiplier, [ COORD_MULT ] );
      
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays( gl.POINTS, 0, vertices.length / pointSize );

        tEnd = new Date();
        var elaborationTime = (tEnd-tRun) / 1000;
        var message = 'Displaying ' + (vertices.length / pointSize) + ' points. Parsed in ' + elaborationTime + ' seconds.';
        console.log( message );
        document.getElementById( 'vertices' ).textContent = message;
        
    }

    function updateMapSize()
    {
        var bounds, extent;
        
        bounds = map.getView().calculateExtent( map.getSize() );
        extent = ol.proj.transformExtent(bounds, 'EPSG:3857', 'EPSG:4326' );
        
        gl.uniform1f( u_viewMinX, [ extent[ 0 ] * COORD_MULT ] );
        gl.uniform1f( u_viewMinY, [ extent[ 1 ] * COORD_MULT ] );
        gl.uniform1f( u_viewMaxX, [ extent[ 2 ] * COORD_MULT ] );
        gl.uniform1f( u_viewMaxY, [ extent[ 3 ] * COORD_MULT ] );

        return extent;
    }
  
    // load and process file
    loadData(
        url,
        function( percentage )
        {
            console.log( 'loaded: ' + percentage + '%' );
        },
        function( data )
        {
            var extents = updateMapSize();
            var vertices = parseData( data, extents );

            drawData( vertices, 1 );
            
            changeMarker.onchange = function( event )
            {
                var vertices = parseData( data );
                drawData( vertices, parseInt( event.target.value, 10 ) );
              
            };
        }
    );
    

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
        function( event )
        {

            var extents = updateMapSize();
            //var vertices = parseData( data, extents );

            //drawData( vertices, 1 );
            
            updateMapSize();
            //drawData( new Float32Array( thePoint ) );
/*
            var aV = [];
            for ( var i = 0; i < allVertices.length / pointSize, i += pointSize )
            {
                aV.push( coordsToCanvas( allvertice ) );
            }
*/
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays( gl.POINTS, 0, allVertices.length / pointSize );
        }
    );
    
}
