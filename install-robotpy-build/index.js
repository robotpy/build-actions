const fs = require('fs').promises;
const core = require('@actions/core');
const exec = require('@actions/exec');
const toml = require('toml');

async function run() {
    // read toml file
    try {
        const tomlString = await fs.readFile("pyproject.toml");
        const data = toml.parse(tomlString);
        
        // find robotpy-build in dependencies
        var found = false;
        var dep = null;
        var requires = data["build-system"]["requires"];

        for (var i = 0; i < requires.length; i++) {
            dep = requires[i];
            if (dep.startsWith("robotpy-build")) {
                found = true;
                break;
            }
        }

        if (!found) {
            core.setFailed("could not find robotpy-build in build dependencies");
            return;
        }

        // Run the installation
        await exec.exec("python", ["-m", "pip", "install", dep]);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();