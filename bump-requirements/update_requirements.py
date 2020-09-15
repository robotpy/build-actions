#!/usr/bin/env python3

import argparse
import glob

from packaging.requirements import Requirement
from packaging.specifiers import SpecifierSet

import typing


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Checks all requirements files and updates them if necessary"
    )
    parser.add_argument("package_name", help="Ex: robotpy-wpilib")
    parser.add_argument("package_version", help="Ex: 2020.1.2")
    parser.add_argument("repo_version", help="Ex: 2020.1.2")

    args = parser.parse_args()

    package_name = args.package_name
    package_version = args.package_version
    repo_version = args.repo_version

    print("Repo Version:", repo_version)
    print("Package Name:", package_name)
    print("Package Version:", package_version)

    # Package version year must match repo version year, otherwise we can end
    # up with users trying to install the prior year's packages and they
    # install a mess instead
    if repo_version.split(".")[0] != package_version.split(".")[0]:
        print("!! Package version year does not match repo version year!")
        return 1

    req_files = ["requirements.txt"] + glob.glob("*-requirements.txt")

    found = False
    for req_fname in req_files:

        print(".. checking", req_fname)

        # Read requirements
        with open(req_fname, "r") as file:
            file_data = file.readlines()

        # Find first line with desired requirement
        req = None
        for lineno, line in enumerate(file_data):
            line = line.strip("\r\n\t ")
            if line and not line.startswith("#"):
                try:
                    r = Requirement(line)
                except Exception as e:
                    raise ValueError(f"Error parsing {req_fname}:{lineno+1}") from e
                else:
                    if r.name == package_name:
                        req = r
                        break

        if req is None:
            continue

        # Ensure that the new package version lies in the current range
        if not req.specifier.contains(package_version):
            print(f"!! {req_fname}: New package version is not within {req.specifier}")
            return 1

        # Find the >= operator and update it
        new_specs = []
        for spec in req.specifier:
            if spec.operator == ">=":
                if spec.version == package_version:
                    print(f"!! {req_fname}: Package version is already lower bound")
                    return 1
                new_specs.append(f">={package_version}")
            else:
                new_specs.append(str(spec))

        req.specifier = SpecifierSet(",".join(new_specs))

        new_requirement = f"{req}\n"
        print(f"-> {req_fname}: Updated requirement: {new_requirement}")
        file_data[lineno] = new_requirement

        with open(req_fname, "w") as file:
            file.writelines(file_data)

        found = True

    if not found:
        print("!! Package not found in", *req_files)
        return 1

    print("Success!")
    return 0


if __name__ == "__main__":
    exit(main())
