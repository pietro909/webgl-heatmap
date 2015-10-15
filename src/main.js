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

function normalizeCoords( x, y )
{
    var newX = x; // (x / 8) - 1.5;
    var newY = y; // (y / 6) - 7;

//    console.log('point:  '+x+', '+y);

    return {
        x : newX,
        y:  newY
    }
    
}

var tRun, tEnd, tStart = new Date();

var map;

var onLoad = function()
{
  'use strict';

    var
        canvas, renderer, stage, container, gl, points = [], allVertices = [],
    OpenLayers = ol,
//      url = '/assets/data/fake-data-1-rop-trunc.csv';
      url = '/assets/data/fake-data-1-rop.csv';
  var pointSize = 9;

    var changeMarker = document.getElementById('changeMarker');

    canvas = document.getElementById( 'theCanvas' );

    // init context
    gl = WebGLUtils.setupWebGL( canvas );
   
    if (!gl)
    {
        alert('WebGL is not available');
        return;
    }

    // load shaders 
    var program = initShaders(gl, 'vertex-shader', 'fragment-shader');

    gl.useProgram(program);

    /** WebGL declarations **/
        
    // associate out shader variables with our data buffer
    var bufferId = gl.createBuffer();
    var vPosition = gl.getAttribLocation( program, 'vPosition' );
    var vColor = gl.getAttribLocation( program, 'vColor' );
    var vUplink = gl.getAttribLocation( program, 'vUplink' );
    var u_UpLinkMax = gl.getUniformLocation( program, 'u_UpLinkMax' );
    var vDownlink = gl.getAttribLocation( program, 'vDownlink');
    var u_DownLinkMax = gl.getUniformLocation( program, 'u_DownLinkMax' );
    var vPmkpi = gl.getAttribLocation( program, 'vPmkpi');
    var u_PmKpiMax = gl.getUniformLocation( program, 'u_PmKpiMax' );
    var u_marker = gl.getUniformLocation( program, 'u_marker' );
    var u_centerPoint = gl.getUniformLocation( program, 'u_centerPoint' );
    var u_zoom = gl.getUniformLocation( program, 'u_zoom' );
    var u_coordsScale = gl.getUniformLocation( program, 'u_coordsScale' );
    gl.uniform1f( u_coordsScale, 5 );
   
    function parseData( data )
    {
        var k,currentPoint,p,  pointArray=[];

        tRun = new Date();

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
                // four bytes baser color
                pointArray.push( 1.0 );
                pointArray.push( 0.0 );
                pointArray.push( 0.0 );
                pointArray.push( 1.0 );
                // point attributes: 
                pointArray.push( currentPoint.UPLINK );
                pointArray.push( currentPoint.DOWNLINK );
                pointArray.push( currentPoint.PM_KPI );
// [14.725038528442383, 40.93919372558594, 1, 0, 0, 1, 717713, 285533, 0, 
//  15.053869247436523, 41.02341842651367, 1, 0, 0, 1, 841152, 605903, 0, 
            }
            
        }
        return( new Float32Array( pointArray ) );
    }
    
    function drawData( vertices, marker )
    {
       
        var stride = pointSize * Float32Array.BYTES_PER_ELEMENT;
        var step = Float32Array.BYTES_PER_ELEMENT;

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
      
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays( gl.POINTS, 0, vertices.length / pointSize );

        tEnd = new Date();
        var elaborationTime = (tEnd-tRun) / 1000;
        var message = 'Displaying ' + (vertices.length / pointSize) + ' points. Parsed in ' + elaborationTime + ' seconds.';
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
            var vertices = parseData( data );
            
            drawData( vertices, 1 );
            
            changeMarker.onchange = function( event )
            {
                var vertices = parseData( data );
                //console.log( bounds[event.target.value].min + ' - ' + bounds[event.target.value].max );
                drawData( vertices, parseInt( event.target.value, 10 ) );
              
            };
        }
    );
    

  
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
      center: [0, 0],
      zoom: 1
    })
  });

  var view = map.getView();
/*
  var position = OpenLayers.Coordinate([40.93919444444444, 14.72503888888889]);
  map.setCenter( position );
*/
  map.addEventListener(
    'moveend',
    function( event )
    {
      var
          center = view.getCenter(),
          zoom = view.getZoom();
      console.log(' center to '+center[0]+', '+center[1]+' at '+zoom );

      gl.uniform2fv( u_centerPoint, center );
      gl.uniform1f( u_zoom, zoom );

      var zzzoom = 5 - zoom;
/*
      var w,uzoom, v,x,y;
      for (var i = 0; i < allVertices.length; i += pointSize)
      {
        uzoom = Math.pow( 10,5 );
        x = allVertices[ i ] - ( center[0] / uzoom );
        y = allVertices[ i + 1] - ( center[1] / uzoom );
        w = Math.pow(10, -(5-zoom)); // (zoom === 5) ? 1 : 1 / ( 5.0 - zoom);
        console.log( 'x: '+allVertices[i] + ' -> ' + x + ' -> ' + (x*w));
        console.log( 'y: '+allVertices[i+1] + ' -> ' + y + ' -> ' + (y*w));
        console.log( 'w: 1 -> ' + w);
      } 
*/
//      console.log(allVertices);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays( gl.POINTS, 0, allVertices.length / pointSize );

    }
  );
    
}
