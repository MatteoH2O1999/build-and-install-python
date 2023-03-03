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
  for (const tag of tags) {
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
      throw new Error(`Error in getting tree for tag ${tag.version}.`);
    }
    const filePaths = [];
    for (const file of response.data.tree) {
      if (filePaths.includes(file.path)) {
        throw new Error(`Duplicate path found in tree for tag ${tag.version}`);
      }
      filePaths.push(file.path);
    }
    trees[tag.version] = filePaths;
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
  fs.writeFileSync(jsonPath, jsonString)
})
