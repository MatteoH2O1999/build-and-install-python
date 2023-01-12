const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

async function updateJson() {
  const octokit = github.getOctokit(process.env['GITHUB_TOKEN']);
  const tags = [];
  let index = 1;
  let changed = true;
  while (changed) {
    changed = false;
    let response = null;
    core.startGroup(`Getting tags ${(index - 1) * 100}-${index * 100}`);
    while (response === null) {
      try {
        response = await octokit.rest.repos.listTags({
          owner: 'python',
          page: index,
          per_page: 100,
          repo: 'cpython'
        });
      } catch (error) {
        core.info('Rest API rate limit reached. Retrying in 60 seconds...');
        await sleep(60);
      }
    }
    if (response.status !== 200) {
      throw new Error('Error in getting tags.');
    }
    for (const tag of response.data) {
      changed = true;
      core.info(`Received tag ${tag.name}`)
      tags.push({version: tag.name, zipBall: tag.zipball_url});
    }
    core.endGroup();
    index++;
  }
  return JSON.stringify(tags, null, 2);
}

const jsonPath = path.join(path.dirname(path.dirname(__dirname)), 'src', 'builder', 'tags.json');
core.info(`Updating ${jsonPath}`);

updateJson().then((jsonString) => {
  core.startGroup('Final JSON string');
  core.info(jsonString);
  core.endGroup();
  fs.writeFileSync(jsonPath, jsonString)
})
