const path = require('path');
const { readJsonSafe, ensureWorkspacePaths, fs } = require('../utils/fs');
const { loadProject } = require('../project/projectLoader');
const { buildFileIndex } = require('../project/fileIndex');
const { detectStack } = require('../stack/stackDetector');
const { validateStack } = require('../stack/stackValidator');
const { validateImports } = require('../imports/importExportValidator');
const { validateContracts } = require('../contracts/contractValidator');
const { compareSpecWithProject } = require('../docs/specComparator');
const { validateMockWiring } = require('../mocks/mockWiringValidator');

async function runAudit(projectPath, specText = '', options = {}) {
  const loaded = await loadProject(projectPath);
  const packageJson = await readJsonSafe(path.join(projectPath, 'package.json'));
  const fileIndex = buildFileIndex(loaded.files);
  const stack = detectStack(loaded.files, packageJson || {});

  const stackFindings = validateStack({
    stack,
    packageJson: packageJson || {},
    projectFiles: loaded.files
  });

  const [importFindings, contractFindings, mockFindings] = await Promise.all([
    validateImports(projectPath, loaded.files),
    validateContracts(projectPath, loaded.files),
    validateMockWiring(projectPath, loaded.files, options.frontendOnly !== false)
  ]);

  const specResult = compareSpecWithProject(specText, fileIndex);

  const findings = [
    ...stackFindings,
    ...importFindings,
    ...contractFindings,
    ...specResult.findings,
    ...mockFindings
  ];

  const summary = {
    total: findings.length,
    errors: findings.filter((f) => f.level === 'error').length,
    warnings: findings.filter((f) => f.level === 'warning').length,
    stack,
    fileCount: loaded.files.length
  };

  const report = {
    summary,
    findings,
    extractedSpec: specResult.extracted
  };

  const appRoot = path.resolve(__dirname, '../../../..');
  const workspacePaths = await ensureWorkspacePaths(appRoot);
  const reportPath = path.join(workspacePaths.reports, 'audit.json');

  await fs.writeJson(
    reportPath,
    {
      errors: summary.errors,
      warnings: summary.warnings,
      items: findings
    },
    { spaces: 2 }
  );

  return {
    ...report,
    reportPath
  };
}

module.exports = {
  runAudit
};
