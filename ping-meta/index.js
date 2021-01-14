const core = require('@actions/core');
const github = require('@actions/github');
const toml = require('toml');

// ref https://github.com/peter-evans/repository-dispatch/blob/master/src/main.ts
async function run() {
    try {
        const token = core.getInput('token');

        const context = github.context;
        const octokit = github.getOctokit(token);
        
        let tag = context.ref.substring('refs/tags/'.length);

        let packageName;
        await octokit.repos.getContent({
            owner: context.repo.owner, // should be 'robotpy'
            repo: context.repo.repo,
            ref: tag,
            path: 'pyproject.toml'
        }).then(result => {
            // content will be base64 encoded
            const tomlString = Buffer.from(result.data.content, 'base64').toString();
            const data = toml.parse(tomlString);
            packageName = data["tool"]["robotpy-build"]["metadata"]["name"];
        })

        await octokit.repos.createDispatchEvent({
            owner: 'robotpy',
            repo: 'robotpy-meta',
            event_type: 'tag',
            client_payload: {'package_name': packageName, 'package_version': tag}
        });

    } catch(error) {
        core.setFailed(error.message);
    }

}

run()