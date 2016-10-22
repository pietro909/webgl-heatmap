precision highp float;

attribute vec4 vPosition;
attribute vec4 vColor;

/* point attributes */
attribute float vUplink;
attribute float vDownlink;
attribute float vPmkpi;

/* the view bounds  */
uniform float u_viewMinX;
uniform float u_viewMaxX;
uniform float u_viewMinY;
uniform float u_viewMaxY;

/* const for the whole map */
uniform float u_UpLinkMax;
uniform float u_DownLinkMax;
uniform float u_PmKpiMax;

uniform int u_marker;
uniform float u_coord_multiplier;

varying vec4 fColor;

float redComponent;
float greenComponent;
float blueComponent;
float pointSize;

/**
 * translate 3D point in projected coordinates (see openlayers.org)
 * to webgl coordinates (-1, +1)
 */
vec4 coordsToCanvas( vec4 point )
{
    float x = ( ( point.x - u_viewMinX ) / ( u_viewMaxX - u_viewMinX ) * 2.0 ) - 1.0;
    float y = ( ( point.y - u_viewMinY ) / ( u_viewMaxY - u_viewMinY ) * 2.0 ) - 1.0;
    return vec4( x, y, point.z, point.w );
}

void main()
{
    vec4 normalizedPoint = coordsToCanvas( vPosition );
    gl_Position = vec4(
        normalizedPoint.x / u_coord_multiplier,
	 	normalizedPoint.y / u_coord_multiplier,
		vPosition.z,
		vPosition.w / u_coord_multiplier
	);
  
    if ( u_marker == 1 ) 
    {
      redComponent = 0.4;
      greenComponent = 0.2;
      blueComponent = vUplink / u_UpLinkMax;
      pointSize = 2.0 * (vUplink / u_UpLinkMax);
    }
    else if ( u_marker == 2 )
    {
      redComponent = 0.9;
      greenComponent = vDownlink / u_DownLinkMax;
      blueComponent = 0.0;
      pointSize = 2.0 * (vDownlink / u_DownLinkMax);
    }
    else
    {
      redComponent = vPmkpi / u_PmKpiMax;
      greenComponent = 0.2;
      blueComponent = 1.0;
      pointSize = 2.0;
    }

    gl_PointSize = pointSize;
  
    fColor = vec4( 
           redComponent, 
		   greenComponent, 
           blueComponent,
		   vColor.w 
		 );
}
