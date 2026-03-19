const path = require('path');
const { parse } = require('@babel/parser');
const { fs } = require('../utils/fs');

const SOURCE_EXTS = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json'];

function parseCodeToAst(code, filePath) {
  return parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
    errorRecovery: false,
    sourceFilename: filePath
  });
}

function collectExports(ast) {
  const named = new Set();
  let hasDefault = false;

  for (const node of ast.program.body) {
    if (node.type === 'ExportDefaultDeclaration') {
      hasDefault = true;
    }

    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        const decl = node.declaration;
        if (decl.id?.name) {
          named.add(decl.id.name);
        }
        if (decl.declarations) {
          for (const d of decl.declarations) {
            if (d.id?.name) named.add(d.id.name);
          }
        }
      }

      if (node.specifiers?.length) {
        node.specifiers.forEach((s) => named.add(s.exported.name));
      }
    }
  }

  return { named, hasDefault };
}

function candidateFiles(basePath) {
  const results = [];

  if (path.extname(basePath)) {
    results.push(basePath);
  } else {
    SOURCE_EXTS.forEach((ext) => results.push(basePath + ext));
    SOURCE_EXTS.forEach((ext) => results.push(path.join(basePath, 'index' + ext)));
  }

  return results;
}

function resolveImportFile(rootPath, importerFile, importSource) {
  if (!importSource.startsWith('.')) {
    return { external: true };
  }

  const importerAbs = path.join(rootPath, importerFile);
  const importerDir = path.dirname(importerAbs);
  const targetBase = path.resolve(importerDir, importSource);

  for (const candidate of candidateFiles(targetBase)) {
    if (fs.existsSync(candidate)) {
      const relative = path.relative(rootPath, candidate).replace(/\\/g, '/');
      return { external: false, exists: true, resolvedFile: relative };
    }
  }

  return {
    external: false,
    exists: false,
    checked: candidateFiles(targetBase).map((file) => path.relative(rootPath, file).replace(/\\/g, '/'))
  };
}

async function validateImports(projectPath, files) {
  const findings = [];
  const moduleExports = {};
  const sourceFiles = files.filter((f) => /\.(jsx?|tsx?)$/.test(f));

  for (const file of sourceFiles) {
    const absPath = path.join(projectPath, file);
    const code = await fs.readFile(absPath, 'utf8');
    try {
      const ast = parseCodeToAst(code, file);
      moduleExports[file] = collectExports(ast);
    } catch (error) {
      findings.push({
        level: 'error',
        code: 'AST_PARSE_ERROR',
        message: `Failed to parse ${file}: ${error.message}`
      });
    }
  }

  for (const file of sourceFiles) {
    const absPath = path.join(projectPath, file);
    const code = await fs.readFile(absPath, 'utf8');
    let ast;
    try {
      ast = parseCodeToAst(code, file);
    } catch {
      continue;
    }

    for (const node of ast.program.body) {
      if (node.type !== 'ImportDeclaration') continue;

      const importSource = node.source.value;
      const resolved = resolveImportFile(projectPath, file, importSource);

      if (!resolved.external && !resolved.exists) {
        findings.push({
          level: 'error',
          code: 'IMPORT_PATH_MISSING',
          message: `${file} imports missing path '${importSource}'`,
          details: resolved.checked
        });
        continue;
      }

      if (resolved.external) {
        continue;
      }

      const targetExports = moduleExports[resolved.resolvedFile];
      if (!targetExports) {
        continue;
      }

      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportDefaultSpecifier' && !targetExports.hasDefault) {
          findings.push({
            level: 'error',
            code: 'DEFAULT_IMPORT_MISMATCH',
            message: `${file} imports default from ${resolved.resolvedFile} but target has no default export`
          });
        }

        if (specifier.type === 'ImportSpecifier') {
          const importedName = specifier.imported.name;
          if (!targetExports.named.has(importedName)) {
            findings.push({
              level: 'error',
              code: 'NAMED_IMPORT_MISMATCH',
              message: `${file} imports { ${importedName} } from ${resolved.resolvedFile} but it is not exported`
            });
          }
        }
      }
    }
  }

  return findings;
}

module.exports = {
  validateImports,
  resolveImportFile
};
