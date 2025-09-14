precision mediump float;
uniform float u_strength;
varying vec2 outTexCoord;
void main() {
  vec2 uv = outTexCoord * 2.0 - 1.0;
  float dist = dot(uv, uv);
  float vignette = smoothstep(1.0, u_strength, dist);
  vec4 col = texture2D(uMainSampler, outTexCoord);
  gl_FragColor = vec4(col.rgb * (1.0 - 0.25 * vignette), col.a);
}
