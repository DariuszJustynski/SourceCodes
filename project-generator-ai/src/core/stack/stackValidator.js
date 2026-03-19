function validateStack({ stack, packageJson = {}, projectFiles = [] }) {
  const findings = [];
  const scripts = packageJson.scripts || {};
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  const fileSet = new Set(projectFiles);

  if (stack.type === 'vite') {
    const hasViteScript = String(scripts.dev || '').includes('vite') && String(scripts.build || '').includes('vite');
    const hasReactScripts = Object.values(scripts).some((script) => String(script).includes('react-scripts'));
    if (hasReactScripts) {
      findings.push({
        level: 'error',
        code: 'STACK_MISMATCH',
        message: 'Vite structure but CRA scripts'
      });
    }
    if (!hasViteScript) {
      findings.push({
        level: 'warning',
        code: 'VITE_SCRIPTS_MISSING',
        message: 'Expected Vite dev/build scripts in package.json'
      });
    }
    if (!deps.vite) {
      findings.push({
        level: 'warning',
        code: 'VITE_DEP_MISSING',
        message: 'Missing vite dependency for detected Vite stack'
      });
    }
    if (!fileSet.has('index.html')) {
      findings.push({
        level: 'error',
        code: 'VITE_INDEX_MISSING',
        message: 'Missing root index.html for Vite project'
      });
    }
  }

  if (stack.type === 'cra') {
    if (!deps['react-scripts']) {
      findings.push({
        level: 'error',
        code: 'CRA_DEP_MISSING',
        message: 'Detected CRA but react-scripts dependency is missing'
      });
    }
    if (!String(scripts.start || '').includes('react-scripts')) {
      findings.push({
        level: 'warning',
        code: 'CRA_SCRIPT_MISSING',
        message: 'Expected start script to use react-scripts'
      });
    }
    if (!fileSet.has('public/index.html')) {
      findings.push({
        level: 'warning',
        code: 'CRA_HTML_MISSING',
        message: 'CRA usually requires public/index.html'
      });
    }
  }

  if (stack.type === 'static') {
    if (!fileSet.has('index.html')) {
      findings.push({
        level: 'error',
        code: 'STATIC_ENTRY_MISSING',
        message: 'Static project should contain index.html at root'
      });
    }
  }

  return findings;
}

module.exports = {
  validateStack
};
