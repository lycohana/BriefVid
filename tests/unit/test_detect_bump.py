from pathlib import Path
import sys

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(REPO_ROOT / "scripts"))

from detect_bump import detect_bump


@pytest.mark.parametrize(
    ("commits", "expected"),
    [
        ([("fix(ui): 调整颜色", "")], ""),
        ([("fix(ui)*: 调整颜色", "")], "patch"),
        ([("feat(desktop)*: 新增更新入口", "")], "minor"),
        ([("feat!: 切换配置格式", "")], "major"),
        ([("fix(core)*!: 重构存储协议", "")], "major"),
        ([("refactor(core): 重构存储协议", "BREAKING CHANGE: storage layout changed")], "major"),
        ([("docs(readme)*: 更新说明", "")], ""),
    ],
)
def test_detect_bump_requires_release_marker_or_breaking_change(
    commits: list[tuple[str, str]],
    expected: str,
) -> None:
    assert detect_bump(commits) == expected
