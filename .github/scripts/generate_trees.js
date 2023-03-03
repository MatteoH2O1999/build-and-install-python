const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

async function updateJson() {
  const octokit = github.getOctokit(process.env['GITHUB_TOKEN']);
  const tags = getTags();
  const trees = {};
  core.startGroup('Downloading trees from Github');
  for (const tag of tags.slice(0, 1)) {
    core.info(`Downloading tree for tag ${tag.version}...`);
    let response = null;
    while (response === null) {
      try {
        response = await octokit.rest.git.getTree({owner: 'python', repo: 'cpython', tree_sha: tag.version, recursive: true});
      } catch (error) {
        core.info('Rest API rate limit reached. Retrying in 60 seconds...');
        await new Promise(r => setTimeout(r, 60000));
      }
    }
    if (response.status !== 200 || response.data.truncated) {
      throw new Error('Error in getting tags.');
    }
    trees[tag.version] = response.data.tree;
  }
  core.endGroup();
  return JSON.stringify(trees, null, 2);
}

function getTags() {
  const tagsPath = path.join(path.dirname(path.dirname(__dirname)), 'src', 'builder', 'tags.json');
  const tags = JSON.parse(fs.readFileSync(tagsPath).toString());
  const filteredTags = [];
  const versions = [];
  for (const tag of tags) {
    const semverVersion = semver.valid(tag.version);
    if (semverVersion && semver.gte(semverVersion, '2.7.0')) {
      if (!versions.includes(semverVersion)) {
        versions.push(semverVersion);
        filteredTags.push(tag);
      }
    }
  }
  return filteredTags;
}

const jsonPath = path.join(path.dirname(path.dirname(__dirname)), 'src', 'builder', '__tests__','cpython.trees.json');
core.info(`Updating ${jsonPath}`);

updateJson().then((jsonString) => {
  core.startGroup('Final JSON string');
  core.info(jsonString);
  core.endGroup();
  fs.writeFileSync(jsonPath, jsonString)
})
