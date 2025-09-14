#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function makeProject(dir, textureName) {
  const absDir = path.resolve(dir);
  const files = fs.readdirSync(absDir).filter(f => f.toLowerCase().endsWith('.png'));
  const images = files.map(f => ({ name: path.basename(f), path: path.join(absDir, f) }));
  return {
    images,
    folders: [],
    savePath: path.resolve('src/assets/sprites'),
    packOptions: {
      textureName,
      width: 2048,
      height: 2048,
      fixedSize: false,
      powerOfTwo: true,
      padding: 4,
      extrude: 2,
      allowRotation: false,
      detectIdentical: true,
      allowTrim: true,
      trimMode: 'trim',
      alphaThreshold: 0,
      removeFileExtension: true,
      prependFolderName: false,
      textureFormat: 'png',
      base64Export: false,
      scale: 1,
      exporter: 'JsonHash'
    }
  };
}

function writeProject(file, project) {
  fs.writeFileSync(file, JSON.stringify(project, null, 2));
  console.log('Wrote', file);
}

writeProject('tools/gameplay.ftpp', makeProject('tools/atlas_src/gameplay', 'gameplay.atlas'));
writeProject('tools/ui.ftpp',        makeProject('tools/atlas_src/ui',       'ui.atlas'));
writeProject('tools/particles.ftpp', makeProject('tools/atlas_src/particles','particles.atlas'));

