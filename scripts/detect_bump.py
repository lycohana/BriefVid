from __future__ import annotations

import argparse
import re
import subprocess
import sys

from versioning import bump_version, read_source_version


COMMIT_SEPARATOR = "\x1e"
FIELD_SEPARATOR = "\x1f"
BREAKING_RE = re.compile(r"^[A-Za-z][\w/-]*(\([^)]*\))?!:")
FEATURE_RE = re.compile(r"^feat(\([^)]*\))?!?:")
PATCH_RE = re.compile(r"^(fix|perf|refactor)(\([^)]*\))?!?:")
RELEASE_RE = re.compile(r"^chore\(release\):\s+v\d+\.\d+\.\d+$")


def run_git(*args: str) -> str:
    return subprocess.run(
        ["git", *args],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    ).stdout.strip()


def latest_version_tag() -> str:
    return run_git("tag", "--list", "v*", "--sort=-version:refname").splitlines()[0] if run_git(
        "tag", "--list", "v*", "--sort=-version:refname"
    ) else ""


def commits_since(tag: str) -> list[tuple[str, str]]:
    revision_range = f"{tag}..HEAD" if tag else "HEAD"
    raw = run_git("log", "--format=%s%x1f%b%x1e", revision_range)
    commits: list[tuple[str, str]] = []
    for entry in raw.split(COMMIT_SEPARATOR):
        item = entry.strip()
        if not item:
            continue
        subject, _, body = item.partition(FIELD_SEPARATOR)
        commits.append((subject.strip(), body.strip()))
    return commits


def detect_bump(commits: list[tuple[str, str]]) -> str:
    filtered = [(subject, body) for subject, body in commits if subject and not RELEASE_RE.match(subject)]
    if not filtered:
        return ""

    for subject, body in filtered:
        if (FEATURE_RE.match(subject) or PATCH_RE.match(subject)) and (
            BREAKING_RE.match(subject) or "BREAKING CHANGE" in body.upper()
        ):
            return "major"

    for subject, _body in filtered:
        if FEATURE_RE.match(subject):
            return "minor"

    for subject, _body in filtered:
        if PATCH_RE.match(subject):
            return "patch"

    return ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Detect the next semantic version bump from git history.")
    parser.add_argument(
        "--github-output",
        help="Optional path to GITHUB_OUTPUT for workflow step outputs.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    current_version = read_source_version()
    tag = latest_version_tag()
    commits = commits_since(tag)
    bump = detect_bump(commits)
    next_version = bump_version(current_version, bump) if bump else current_version

    print(f"current_version={current_version}")
    print(f"latest_tag={tag or 'none'}")
    print(f"bump={bump or 'none'}")
    print(f"next_version={next_version}")

    if args.github_output:
        with open(args.github_output, "a", encoding="utf-8") as handle:
            handle.write(f"current_version={current_version}\n")
            handle.write(f"latest_tag={tag}\n")
            handle.write(f"bump={bump}\n")
            handle.write(f"next_version={next_version}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
