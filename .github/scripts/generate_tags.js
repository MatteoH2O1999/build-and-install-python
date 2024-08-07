const axios = require('axios').default;
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

const ftpPythonUrl = 'https://www.python.org/ftp/python';

async function updateJson() {
  const octokit = github.getOctokit(process.env['GITHUB_TOKEN']);
  const tags = [];
  core.startGroup('Getting tags');
  for (const tag of await octokit.paginate(octokit.rest.repos.listTags, {owner: 'python', repo: 'cpython', per_page: 100})) {
    core.info(`Received tag ${tag.name}`);
    let installer = false;
    const cleanTag = semver.clean(tag.name);
    const exts = ['.amd64.msi', '-amd64.exe'];
    const filename = `python-${cleanTag}`;
    for (const ext of exts) {
      const url = `${ftpPythonUrl}/${cleanTag}/${filename}${ext}`;
      let done = false;
      while (!done) {
        try {
          const response = await axios.get(url, {validateStatus: (status) => {return [axios.HttpStatusCode.Ok, axios.HttpStatusCode.NotFound].includes(status)}});
          if (response.status === axios.HttpStatusCode.Ok) {
            installer = true;
          }
          done = true;
        } catch (error) {
          continue;
        }
      }
    }
    tags.push({installer, version: tag.name, zipBall: tag.zipball_url});
  }
  core.endGroup();
  return JSON.stringify(tags, null, 2);
}

const jsonPath = path.join(path.dirname(path.dirname(__dirname)), 'src', 'builder', 'tags.json');
core.info(`Updating ${jsonPath}`);

updateJson().then((jsonString) => {
  fs.writeFileSync(jsonPath, jsonString)
});
