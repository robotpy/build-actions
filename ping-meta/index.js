const core = require('@actions/core');
const github = require('@actions/github');
const ini = require('ini');
const toml = require('toml');

function getPlainFile(octokit, repo, ref, path) {
    return octokit.repos.getContent({
        owner: repo.owner, // should be 'robotpy'
        repo: repo.repo,
        ref,
        path,
    }).then(result => Buffer.from(result.data.content, 'base64').toString());
}

function getPackageName(octokit, repo, ref) {
    return getPlainFile(octokit, repo, ref, 'pyproject.toml')
        .then(result => result.tool['robotpy-build'].metadata.name)
        .catch(() => getPlainFile(octokit, repo, ref, 'setup.cfg')
                    .then(result => result.metadata.name));
}

// ref https://github.com/peter-evans/repository-dispatch/blob/master/src/main.ts
async function run() {
    const context = github.context;

    if (!context.ref.startsWith('refs/tags/'))
        return;

    const tag = context.ref.slice('refs/tags/'.length);
    // Skip prerelease tags.
    if (!/^\d+(?:\.\d+)*$/.test(tag))
        return;

    const token = core.getInput('token');
    const octokit = github.getOctokit(token);

    try {
        const packageName = await getPackageName(octokit, context.repo, tag);

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
