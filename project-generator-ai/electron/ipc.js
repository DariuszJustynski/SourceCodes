const { ipcMain } = require('electron');
const path = require('path');
const { runPipeline } = require('../src/core/pipeline/pipelineRunner');
const { loadProject } = require('../src/core/project/projectLoader');

function registerIpcHandlers() {
  ipcMain.handle('audit:run', async (_, payload) => {
    const result = await runPipeline(payload || {});
    return result;
  });

  ipcMain.handle('project:load', async (_, payload) => {
    const projectPath = payload?.projectPath;
    if (!projectPath) {
      throw new Error('projectPath is required');
    }

    const loaded = await loadProject(path.resolve(projectPath));
    return loaded;
  });
}

module.exports = {
  registerIpcHandlers
};
