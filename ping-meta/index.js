const fs = require('fs').promises;
const core = require('@actions/core');
const github = require('@actions/github');
const toml = require('toml');

// https://github.com/peter-evans/repository-dispatch/blob/master/src/main.ts
async function run() {
    const token = core.getInput('token');
    const version = core.getInput('version');
    try {
        const tomlString = await fs.readFile("pyproject.toml");
        const data = toml.parse(tomlString);
        const fromRepoName = data["tool"]["robotpy-build"]["metadata"]["name"];

        const octokit = github.getOctokit(token);

        await octokit.repos.createDispatchEvent({
            owner: 'robotpy',
            repo: 'robotpy-meta',
            event_type: 'tag',
            client_payload: {'package_name': fromRepoName, 'package_version': version}
        });

    } catch(error) {
        core.setFailed(error.message);
    }


}

run()