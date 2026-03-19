const path = require('path');

function inferFileType(relativePath) {
  const normalized = relativePath.toLowerCase();
  const baseName = path.basename(relativePath).toLowerCase();

  if (normalized.includes('/components/') || /card|button|modal|input/.test(baseName)) {
    return 'component';
  }
  if (normalized.includes('/pages/') || /page\./.test(baseName)) {
    return 'page';
  }
  if (normalized.includes('/routes/') || baseName.includes('router')) {
    return 'routing';
  }
  if (normalized.includes('/services/') || baseName.includes('api')) {
    return 'service';
  }

  return 'file';
}

function buildFileIndex(files) {
  return files.reduce((acc, relativePath) => {
    const ext = path.extname(relativePath);
    acc[relativePath] = {
      ext,
      type: inferFileType(relativePath)
    };
    return acc;
  }, {});
}

module.exports = {
  buildFileIndex,
  inferFileType
};
