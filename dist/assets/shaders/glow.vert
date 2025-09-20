precision mediump float;
attribute vec2 inPosition;
attribute vec2 inTexCoord;
uniform mat4 uProjectionMatrix;
varying vec2 outTexCoord;
void main() {
  gl_Position = uProjectionMatrix * vec4(inPosition, 0.0, 1.0);
  outTexCoord = inTexCoord;
}
