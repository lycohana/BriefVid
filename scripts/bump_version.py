from __future__ import annotations

import argparse
import sys

from versioning import bump_version, collect_version_mismatches, read_source_version, sync_version


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bump or verify the repository version.")
    parser.add_argument(
        "target",
        nargs="?",
        help="One of patch/minor/major or an explicit semantic version.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if any versioned file is out of sync with VERSION.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.check:
        mismatches = collect_version_mismatches()
        if mismatches:
            print("Version files are out of sync with VERSION:", file=sys.stderr)
            for mismatch in mismatches:
                print(f"  - {mismatch}", file=sys.stderr)
            return 1
        print(read_source_version())
        return 0

    if not args.target:
        print("A bump target is required unless --check is used.", file=sys.stderr)
        return 2

    current = read_source_version()
    next_version = bump_version(current, args.target)
    sync_version(next_version)
    print(next_version)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
