const path = require('path');
const importDynamic = new Function('specifier', 'return import(specifier)');

async function createGitRepositoryService(repoUrl) {
  const servicePath = path.join(process.cwd(), 'dist/server/data/services/GitRepositoryService.js');
  const { GitRepositoryService } = await importDynamic(`file://${servicePath}`);
  return new GitRepositoryService(repoUrl);
}

async function createSpecRepositoryService(repoUrl) {
  const servicePath = path.join(process.cwd(), 'dist/server/data/services/SpecRepositoryService.js');
  const { SpecRepositoryService } = await importDynamic(`file://${servicePath}`);
  return new SpecRepositoryService(repoUrl);
}

module.exports = {
  createGitRepositoryService,
  createSpecRepositoryService
}; 