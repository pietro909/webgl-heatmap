attribute vec4 vPosition;
attribute vec4 vColor;

/* the view bounds  */
uniform float u_viewMinX;
uniform float u_viewMaxX;
uniform float u_viewMinY;
uniform float u_viewMaxY;

varying vec4 fColor;

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
    gl_Position = vec4( normalizedPoint.x,
			normalizedPoint.y,
			vPosition.z,
			vPosition.w
		      );
    
    gl_PointSize = 10.0;
  
    fColor = vec4( vColor.x, 
		   vColor.y, 
		   vColor.z, 
		   vColor.w 
		 );
}
