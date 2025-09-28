precision mediump float;
uniform float u_time;
uniform float u_intensity;
uniform vec2 u_resolution;
varying vec2 outTexCoord;
void main() {
  vec2 uv = outTexCoord;
  vec3 col = texture2D(uMainSampler, uv).rgb;
  float pulse = 0.5 + 0.5 * sin(u_time * 6.2831);
  col += col * u_intensity * pulse;
  gl_FragColor = vec4(col, 1.0);
}
