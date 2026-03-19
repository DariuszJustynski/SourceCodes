const { runAudit } = require('../audit/auditEngine');

async function runPipeline({ projectPath, specText, frontendOnly = true }) {
  if (!projectPath) {
    throw new Error('projectPath is required');
  }

  const result = await runAudit(projectPath, specText || '', { frontendOnly });

  return {
    stage: 'completed',
    ...result
  };
}

module.exports = {
  runPipeline
};
