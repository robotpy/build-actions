const core = require('@actions/core');
const github = require('@actions/github');
const toml = require('toml');

// ref https://github.com/peter-evans/repository-dispatch/blob/master/src/main.ts
async function run() {
    try {
        const token = core.getInput('token');
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

        const octokit = github.getOctokit(token);
        
        let packageName;
        await octokit.repos.getContent({
            owner: owner, // should be 'robotpy'
            repo: repo,
            path: 'pyproject.toml'
        }).then(result => {
            // content will be base64 encoded
            const tomlString = Buffer.from(result.data.content, 'base64').toString();
            const data = toml.parse(tomlString);
            packageName = data["tool"]["robotpy-build"]["metadata"]["name"];
        })

        let packageVersion;
        await octokit.repos.listTags({
            owner: owner, // should be 'robotpy'
            repo: repo
        }).then(result => {
            packageVersion = result.data[0]["name"];
        });

        await octokit.repos.createDispatchEvent({
            owner: 'robotpy',
            repo: 'robotpy-meta',
            event_type: 'tag',
            client_payload: {'package_name': packageName, 'package_version': packageVersion}
        });

    } catch(error) {
        core.setFailed(error.message);
    }

}

run()