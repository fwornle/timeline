const path = require('path');

async function createGitRepositoryService(repoUrl) {
  // Just return a mock service that matches the interface
  return {
    getHistory: async () => {
      // The actual mock data generation happens in the server
      return [];
    }
  };
}

async function createSpecRepositoryService(repoUrl) {
  // Just return a mock service that matches the interface
  return {
    getHistory: async () => {
      // The actual mock data generation happens in the server
      return [];
    }
  };
}

module.exports = {
  createGitRepositoryService,
  createSpecRepositoryService
}; 