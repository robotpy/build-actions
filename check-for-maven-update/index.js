const fs = require('fs').promises;
const core = require('@actions/core');
const github = require('@actions/github');
const toml = require('toml');
const fetch = require('node-fetch');
const parseString = require('xml2js').parseString;
const compareVersions = require('compare-versions');

async function run() {
    const githubToken = core.getInput('token');
    const ocktokit = github.getOctokit(githubToken);

    try {
        const tomlString = await fs.readFile("pyproject.toml");
        const data = toml.parse(tomlString);
        
        let mavenLibDownloads = [];
        
        let rpybuild = data["tool"]["robotpy-build"];
        
        if (rpybuild["wrappers"]){
            for (const [key, value] of Object.entries(rpybuild["wrappers"])) {
                let mvl = value["maven_lib_download"];
                if (mvl) {
                    mavenLibDownloads.push(mvl);
                }
            }
        }

        if (rpybuild["static_libs"]){
            for (const [key, value] of Object.entries(rpybuild["static_libs"])) {
                let mvl = value["maven_lib_download"];
                if (mvl) {
                    mavenLibDownloads.push(mvl);
                }
            }
        }
        
        core.info("maven_lib_downloads found:");
        core.info(mavenLibDownloads);

        var outOfDates = [];

        for (const mvl of mavenLibDownloads) {
            let currentVersion = mvl["version"];
            let metadataUrl = `${mvl["repo_url"]}/${mvl["group_id"].replace(/\./g, "/")}/${mvl["artifact_id"]}/maven-metadata.xml`;
            
            await fetch(metadataUrl)
            .then((resp) => resp.text())
            .then(function(xml) {
                
                parseString(xml, (err, result) => {

                    let releaseVersion = result["metadata"]["versioning"][0]["release"][0];
                    if( compareVersions.compare(releaseVersion, currentVersion, '>')) {
                        outOfDates.push({"artifact": mvl["artifact_id"], "currentVersion": currentVersion, "newVersion": releaseVersion});
                    }

                });
            
            })
            .catch(function(error) {
                core.error("Maven parsing failed!");
                core.setFailed(error.message);
            });

        }

        outOfDates.sort((a, b) => a["artifact"].localeCompare(b["artifact"]));

        core.info("updates found:");
        core.info(outOfDates);

        const issueTitle = "[nag] Update Maven Dependencies";
        const issueBody = outOfDates.reduce( (out, ood) =>
            out + `- ${ood["artifact"]}: ${ood["currentVersion"]} --> ${ood["newVersion"]}\n`
        , "Maven library updates available:\n\n")

        let existingIssue;
        // refer https://github.com/JasonEtco/create-an-issue/blob/main/src/action.ts
        try {
            const existingIssues = await ocktokit.search.issuesAndPullRequests({
                q: `is:open is:issue repo:${process.env.GITHUB_REPOSITORY} in:title ${issueTitle}`
            });
            existingIssue = existingIssues.data.items.find(issue => issue.title === issueTitle);
        } catch (error) {
            core.error("Issue fetching failed!");
            core.setFailed(error.message);
        }
        
        if (existingIssue) {
            if (existingIssue.body !== issueBody){
                // update existing issue instead creating a new one
                try {
                    const issue = await ocktokit.issues.update({
                        repo: process.env.GITHUB_REPOSITORY,
                        issue_number: existingIssue.number,
                        body: issueBody
                    });
                } catch (error) {
                    core.error("Issue update failed!");
                    core.setFailed(error.message);
                }
            }
        } else {
            // create a new issue
            try {
                const issue = await ocktokit.issues.create({
                    repo: process.env.GITHUB_REPOSITORY,
                    title: issueTitle,
                    body: issueBody
                });  
            } catch (error) {
                core.error("Issue creation failed!");
                core.setFailed(error.message);
            }
        }


    } catch (error) {
        core.error("Script failed!");
        core.setFailed(error.message);
    }
}

run()