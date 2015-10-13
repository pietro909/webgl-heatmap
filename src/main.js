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
                  currentDoc[ key ] = parsed;
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

function normalizeCoords( x, y )
{
    var newX =  (x / 8) - 1.5;
    var newY =  (y / 6) - 7;

    return {
        x : newX,
        y:  newY
    }
    
}

var onLoad = function()
{
  'use strict';

    var
    map, canvas, renderer, stage, container, gl, points = [],
//    OpenLayers = ol,
//      url = '/assets/data/fake-data-1-rop-trunc.csv';
      url = '/assets/data/fake-data-1-rop.csv';

    var changeMarker = document.getElementById('changeMarker');

    canvas = document.getElementById( 'theCanvas' );

    // init context
    gl = WebGLUtils.setupWebGL( canvas );
   
    if (!gl)
    {
        alert('WebGL is not available');
        return;
    }

    function parseData( data, marker )
    {
        var k,currentPoint,p,  pointArray=[];

        for ( var i = 0; i < data.length; i += 1 )
        {
            k = i * 2;
            currentPoint = data[ i ];
            p = normalizeCoords( currentPoint.LON, currentPoint.LAT );
            
            if ( p !== null )
            {
                // two bytes position
                pointArray.push( p.x );
                pointArray.push( p.y );
                // four bytes color
                if ( marker === 'UPLINK' )
                {
                    pointArray.push( 0.1 );
                    pointArray.push( currentPoint[marker] / bounds[marker].max );
                }
                else if ( marker === 'DOWNLINK' )
                {
                    pointArray.push( currentPoint[marker] / bounds[marker].max );
                    pointArray.push( currentPoint[marker] / bounds[marker].max );
                }
                else
                {
                    pointArray.push( currentPoint[marker] / bounds[marker].max );
                    pointArray.push( 0.1 );
                }
                pointArray.push( 0.0 );
                pointArray.push( 1.0 );
            }
            
        }
        return( new Float32Array( pointArray ) );
    }
    
    function drawData( vertices )
    {
        var stride = 6 * Float32Array.BYTES_PER_ELEMENT;
        var step = Float32Array.BYTES_PER_ELEMENT;
        
        // configure webgl
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.94, 0.98, 0.98, 1.0);
        
        // load shaders
        var program = initShaders(gl, 'vertex-shader', 'fragment-shader');

        gl.useProgram(program);
        
        // load data into the GPU
        var bufferId = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // associate out shader variables with our data buffer
        var vPosition = gl.getAttribLocation(program, 'vPosition');
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(vPosition);
        
        var vColor = gl.getAttribLocation(program, 'vColor');
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, stride, 2*step);
        gl.enableVertexAttribArray(vColor);
        
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays( gl.POINTS, 0, vertices.length / 6 );

        var message = 'Displaying ' + (vertices.length / 6) + ' points.';
        console.log( message );
        document.getElementById( 'vertices' ).textContent = message;
        
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
            var vertices = parseData( data, 'UPLINK' );
            
            drawData( vertices );
            
            changeMarker.onchange = function( event )
            {
                var vertices = parseData( data, event.target.value );
                //console.log( bounds[event.target.value].min + ' - ' + bounds[event.target.value].max );
                drawData( vertices );
                
            };
        }
    );
    

  /*
  map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      })
    ],
    target: 'theMap',
    controls: ol.control.defaults({
      attributionOptions: ({
        collapsible: false
      })
    }),
    view: new ol.View({
      center: [0, 0],
      zoom: 2
    })
  });
  */
    
}
