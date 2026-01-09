const fs = require('fs').promises;
const core = require('@actions/core');
const exec = require('@actions/exec');
const toml = require('toml');

async function run() {

    // read toml file
    try {
        const pythonPath = core.getInput("python");
        const crossExpose = core.getInput("cross-expose");
        const tomlString = await fs.readFile("pyproject.toml");
        const data = toml.parse(tomlString);
        
        // find semiwrap in dependencies
        var found = false;
        var dep = null;
        var requires = data["build-system"]["requires"];

        for (var i = 0; i < requires.length; i++) {
            dep = requires[i];
            if (dep.startsWith("semiwrap")) {
                found = true;
                break;
            }
        }

        if (!found) {
            core.setFailed("could not find semiwrap in build dependencies");
            return;
        }

        core.info("[install-semiwrap] semiwrap dependency found: " + dep);

        // Run the installation
        await exec.exec(pythonPath, ["-m", "pip", "--disable-pip-version-check", "install", dep]);
        if (crossExpose != "") {
          await exec.exec(crossExpose, ["semiwrap"]);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
