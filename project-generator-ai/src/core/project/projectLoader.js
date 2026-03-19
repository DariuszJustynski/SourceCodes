const path = require('path');
const { fs } = require('../utils/fs');

const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.git']);

async function loadProject(projectPath) {
  const absoluteRoot = path.resolve(projectPath);
  const fileList = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(absoluteRoot, absolutePath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          await walk(absolutePath);
        }
        continue;
      }

      fileList.push(relativePath);
    }
  }

  await walk(absoluteRoot);

  return {
    rootPath: absoluteRoot,
    files: fileList.sort()
  };
}

module.exports = {
  loadProject,
  IGNORED_DIRS
};
