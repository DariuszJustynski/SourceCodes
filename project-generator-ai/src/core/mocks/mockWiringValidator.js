const path = require('path');
const { fs } = require('../utils/fs');

async function validateMockWiring(projectPath, files, frontendOnly = true) {
  if (!frontendOnly) return [];

  const findings = [];
  const sourceFiles = files.filter((f) => /\.(jsx?|tsx?)$/.test(f));

  for (const file of sourceFiles) {
    const code = await fs.readFile(path.join(projectPath, file), 'utf8');
    const apiCalls = [
      ...code.matchAll(/fetch\((['"`])([^'"`]+)\1/g),
      ...code.matchAll(/axios\.(get|post|put|delete|patch)\((['"`])([^'"`]+)\2/g)
    ];

    for (const match of apiCalls) {
      const endpoint = match[2] || match[3];
      if (endpoint && endpoint.includes('/api/')) {
        findings.push({
          level: 'error',
          code: 'FRONTEND_ONLY_API_CALL',
          message: `Forbidden API call in frontend-only mode in ${file}: ${endpoint}`
        });
      }
    }
  }

  return findings;
}

module.exports = {
  validateMockWiring
};
