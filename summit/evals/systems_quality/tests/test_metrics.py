import pytest
from unittest.mock import patch, MagicMock
from summit.evals.systems_quality.metrics import calculate_defect_density, calculate_rework_rate, calculate_variance_score

@patch("summit.evals.systems_quality.metrics.run_git_command")
def test_calculate_defect_density(mock_git):
    # Case 1: Standard case
    mock_git.return_value = " 3 files changed, 10 insertions(+), 10 deletions(-)"
    # 20 lines total. 2 failing tests. Density = 2/20 = 0.1
    density = calculate_defect_density("/tmp/repo", "HEAD~1..HEAD", 2)
    assert density == 0.1

    # Case 2: No output (error or empty diff)
    mock_git.return_value = ""
    assert calculate_defect_density("/tmp/repo", "HEAD~1..HEAD", 2) == 0.0

    # Case 3: Zero lines changed
    mock_git.return_value = " 0 files changed, 0 insertions(+), 0 deletions(-)"
    assert calculate_defect_density("/tmp/repo", "HEAD~1..HEAD", 2) == 0.0

@patch("summit.evals.systems_quality.metrics.run_git_command")
def test_calculate_rework_rate(mock_git):
    # Case 1: Standard case
    mock_git.return_value = "file1.py\nfile2.py\nfile1.py\nfile3.py"
    # file1.py modified twice. Total unique files: 3 (file1, file2, file3).
    # Reworked: 1 (file1). Rate: 1/3 = 0.333...
    rate = calculate_rework_rate("/tmp/repo", "HEAD~5..HEAD")
    assert rate == pytest.approx(0.3333, 0.001)

    # Case 2: No files
    mock_git.return_value = ""
    assert calculate_rework_rate("/tmp/repo", "HEAD~5..HEAD") == 0.0

    # Case 3: All unique
    mock_git.return_value = "file1.py\nfile2.py"
    assert calculate_rework_rate("/tmp/repo", "HEAD~5..HEAD") == 0.0

def test_calculate_variance_score():
    scores = [0.8, 0.9, 0.85]
    # stddev of these is approx 0.05
    variance = calculate_variance_score(scores)
    assert variance > 0

    assert calculate_variance_score([]) == 0.0
    assert calculate_variance_score([0.8]) == 0.0
