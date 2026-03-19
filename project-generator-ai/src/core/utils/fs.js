const fs = require('fs-extra');
const path = require('path');

async function readJsonSafe(filePath) {
  try {
    return await fs.readJson(filePath);
  } catch (error) {
    return null;
  }
}

async function ensureWorkspacePaths(basePath) {
  const paths = {
    input: path.join(basePath, 'workspace', 'input'),
    output: path.join(basePath, 'workspace', 'output'),
    reports: path.join(basePath, 'workspace', 'reports')
  };

  await Promise.all(Object.values(paths).map((p) => fs.ensureDir(p)));
  return paths;
}

function hasFileWithAnyExtension(baseWithoutExt, exts) {
  return exts.some((ext) => fs.existsSync(baseWithoutExt + ext));
}

module.exports = {
  fs,
  readJsonSafe,
  ensureWorkspacePaths,
  hasFileWithAnyExtension
};
