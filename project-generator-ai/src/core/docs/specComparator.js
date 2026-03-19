function unique(arr) {
  return [...new Set(arr)];
}

function extractFromSpec(specText = '') {
  const pageMatches = specText.match(/\b[A-Z][A-Za-z0-9]*Page\b/g) || [];
  const componentMatches = specText.match(/\b[A-Z][A-Za-z0-9]*(Card|Button|Modal|List|Form|Item|Header|Footer|Nav|Table|Widget)\b/g) || [];
  const endpointMatches = specText.match(/\/(api|v\d+)[^\s'"`)]*/g) || [];

  return {
    pages: unique(pageMatches),
    components: unique(componentMatches),
    endpoints: unique(endpointMatches)
  };
}

function compareSpecWithProject(specText, fileIndex) {
  const findings = [];
  const extracted = extractFromSpec(specText);
  const files = Object.keys(fileIndex);
  const normalizedFiles = files.map((f) => f.toLowerCase());

  for (const page of extracted.pages) {
    const hasPage = normalizedFiles.some((file) => file.includes(page.toLowerCase()));
    if (!hasPage) {
      findings.push({
        level: 'warning',
        code: 'SPEC_PAGE_MISSING',
        message: `Page from specification not found in project: ${page}`
      });
    }
  }

  for (const component of extracted.components) {
    const hasComp = normalizedFiles.some((file) => file.includes(component.toLowerCase()));
    if (!hasComp) {
      findings.push({
        level: 'warning',
        code: 'SPEC_COMPONENT_MISSING',
        message: `Component from specification not found in project: ${component}`
      });
    }
  }

  const routeHeuristicFile = normalizedFiles.find((f) => f.includes('route') || f.includes('router') || f.includes('app.jsx') || f.includes('app.js'));
  if (extracted.pages.length > 0 && !routeHeuristicFile) {
    findings.push({
      level: 'warning',
      code: 'ROUTING_HEURISTIC_MISSING',
      message: 'Specification defines pages but project has no obvious routing file'
    });
  }

  return { extracted, findings };
}

module.exports = {
  compareSpecWithProject,
  extractFromSpec
};
