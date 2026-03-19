function detectStack(projectFiles, packageJson = {}) {
  const fileSet = new Set(projectFiles);
  const scripts = packageJson.scripts || {};
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const hasViteFiles = fileSet.has('vite.config.js') || fileSet.has('vite.config.mjs') || fileSet.has('vite.config.ts');
  const hasViteEntry = fileSet.has('src/main.jsx') || fileSet.has('src/main.tsx') || fileSet.has('src/main.js');
  const hasRootHtml = fileSet.has('index.html');

  const hasCraDeps = !!deps['react-scripts'];
  const hasCraScript = Object.values(scripts).some((script) => String(script).includes('react-scripts'));

  if (hasViteFiles && hasViteEntry && hasRootHtml) {
    return { type: 'vite', confidence: 0.9 };
  }

  if (hasCraDeps || hasCraScript) {
    return { type: 'cra', confidence: 0.85 };
  }

  return { type: 'static', confidence: 0.55 };
}

module.exports = {
  detectStack
};
