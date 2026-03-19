const path = require('path');
const { parse } = require('@babel/parser');
const { fs } = require('../utils/fs');

function normalizePropName(name) {
  return String(name)
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value.type === 'string') walk(value, visit);
  }
}

function getFunctionParamProps(params) {
  const props = new Set();
  const first = params[0];
  if (!first) return props;

  if (first.type === 'Identifier') {
    props.__fromPropsIdentifier = first.name;
  }

  if (first.type === 'ObjectPattern') {
    for (const p of first.properties) {
      if (p.type === 'ObjectProperty' && p.key?.name) {
        props.add(normalizePropName(p.key.name));
      }
    }
  }

  return props;
}

function extractComponentContracts(ast, file) {
  const components = {};

  function ensureComp(name) {
    if (!components[name]) {
      components[name] = { usedProps: new Set(), file };
    }
    return components[name];
  }

  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && /^[A-Z]/.test(node.id?.name || '')) {
      const comp = ensureComp(node.id.name);
      const initial = getFunctionParamProps(node.params);
      const propsIdentifier = initial.__fromPropsIdentifier;
      delete initial.__fromPropsIdentifier;
      initial.forEach((p) => comp.usedProps.add(p));

      walk(node.body, (n) => {
        if (
          propsIdentifier &&
          n.type === 'MemberExpression' &&
          n.object?.type === 'Identifier' &&
          n.object.name === propsIdentifier &&
          n.property?.name
        ) {
          comp.usedProps.add(normalizePropName(n.property.name));
        }
      });
    }

    if (
      node.type === 'VariableDeclaration'
    ) {
      for (const decl of node.declarations) {
        const name = decl.id?.name;
        const init = decl.init;
        if (!name || !/^[A-Z]/.test(name) || !init) continue;
        const isFunction = init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression';
        if (!isFunction) continue;

        const comp = ensureComp(name);
        const initial = getFunctionParamProps(init.params || []);
        const propsIdentifier = initial.__fromPropsIdentifier;
        delete initial.__fromPropsIdentifier;
        initial.forEach((p) => comp.usedProps.add(p));

        walk(init.body, (n) => {
          if (
            propsIdentifier &&
            n.type === 'MemberExpression' &&
            n.object?.type === 'Identifier' &&
            n.object.name === propsIdentifier &&
            n.property?.name
          ) {
            comp.usedProps.add(normalizePropName(n.property.name));
          }
        });
      }
    }
  }

  return components;
}

function extractJsxPropPassing(ast) {
  const passed = [];
  walk(ast, (node) => {
    if (node.type === 'JSXOpeningElement' && node.name?.type === 'JSXIdentifier') {
      const component = node.name.name;
      if (!/^[A-Z]/.test(component)) return;
      const props = node.attributes
        .filter((a) => a.type === 'JSXAttribute' && a.name?.name)
        .map((a) => normalizePropName(a.name.name));
      passed.push({ component, props });
    }
  });
  return passed;
}

async function validateContracts(projectPath, files) {
  const sourceFiles = files.filter((f) => /\.(jsx?|tsx?)$/.test(f));
  const findings = [];
  const componentContracts = {};
  const allUsages = [];

  for (const file of sourceFiles) {
    const code = await fs.readFile(path.join(projectPath, file), 'utf8');
    let ast;
    try {
      ast = parse(code, { sourceType: 'unambiguous', plugins: ['jsx'] });
    } catch {
      continue;
    }

    const contracts = extractComponentContracts(ast, file);
    Object.assign(componentContracts, contracts);
    allUsages.push(...extractJsxPropPassing(ast).map((u) => ({ ...u, file })));
  }

  for (const usage of allUsages) {
    const contract = componentContracts[usage.component];
    if (!contract) continue;

    for (const prop of usage.props) {
      if (!contract.usedProps.has(prop)) {
        findings.push({
          level: 'warning',
          code: 'UNUSED_PASSED_PROP',
          message: `Prop '${prop}' passed to ${usage.component} in ${usage.file} is not used in ${contract.file}`
        });
      }
    }
  }

  return findings;
}

module.exports = {
  validateContracts,
  normalizePropName
};
