import unittest
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.get_bot_prs import get_ready_to_merge_prs

class TestGetBotPRs(unittest.TestCase):

    def _mock_graphql_response(self, prs, has_next_page=False, end_cursor=None):
        return {
            "data": {
                "repository": {
                    "pullRequests": {
                        "nodes": prs,
                        "pageInfo": {
                            "hasNextPage": has_next_page,
                            "endCursor": end_cursor
                        }
                    }
                }
            }
        }

    @patch('scripts.get_bot_prs.requests.post')
    @patch('scripts.get_bot_prs.os.environ')
    def test_get_ready_to_merge_prs_no_prs(self, mock_environ, mock_post):
        mock_environ.get.side_effect = lambda key, default=None: {
            "GITHUB_TOKEN": "test_token",
            "GITHUB_REPOSITORY": "test_owner/test_repo",
            "BOT_AUTHORS": "dependabot[bot],renovate[bot]"
        }.get(key, default)

        mock_response = MagicMock()
        mock_response.json.return_value = self._mock_graphql_response([])
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = get_ready_to_merge_prs()
        self.assertEqual(result, "[]")

    @patch('scripts.get_bot_prs.requests.post')
    @patch('scripts.get_bot_prs.os.environ')
    def test_get_ready_to_merge_prs_with_pagination(self, mock_environ, mock_post):
        mock_environ.get.side_effect = lambda key, default=None: {
            "GITHUB_TOKEN": "test_token",
            "GITHUB_REPOSITORY": "test_owner/test_repo",
            "BOT_AUTHORS": "dependabot[bot],renovate[bot]"
        }.get(key, default)

        prs_page1 = [
            {
                "number": 1,
                "author": {"login": "dependabot[bot]"},
                "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": "SUCCESS"}}}]},
                "reviews": {"totalCount": 1}
            }
        ]
        prs_page2 = [
            {
                "number": 2,
                "author": {"login": "renovate[bot]"},
                "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": "SUCCESS"}}}]},
                "reviews": {"totalCount": 1}
            }
        ]

        mock_response1 = MagicMock()
        mock_response1.json.return_value = self._mock_graphql_response(prs_page1, has_next_page=True, end_cursor="cursor1")
        mock_response1.raise_for_status.return_value = None

        mock_response2 = MagicMock()
        mock_response2.json.return_value = self._mock_graphql_response(prs_page2)
        mock_response2.raise_for_status.return_value = None

        mock_post.side_effect = [mock_response1, mock_response2]

        result = get_ready_to_merge_prs()
        self.assertEqual(result, "[1, 2]")

    @patch('scripts.get_bot_prs.requests.post')
    @patch('scripts.get_bot_prs.os.environ')
    def test_get_ready_to_merge_prs_mixed_with_pagination(self, mock_environ, mock_post):
        mock_environ.get.side_effect = lambda key, default=None: {
            "GITHUB_TOKEN": "test_token",
            "GITHUB_REPOSITORY": "test_owner/test_repo",
            "BOT_AUTHORS": "dependabot[bot],renovate[bot]"
        }.get(key, default)

        prs_page1 = [
            { # Valid
                "number": 1,
                "author": {"login": "dependabot[bot]"},
                "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": "SUCCESS"}}}]},
                "reviews": {"totalCount": 1}
            },
            { # Invalid author
                "number": 2,
                "author": {"login": "not-a-bot"},
                "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": "SUCCESS"}}}]},
                "reviews": {"totalCount": 1}
            }
        ]
        prs_page2 = [
            { # Failing CI
                "number": 3,
                "author": {"login": "renovate[bot]"},
                "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": "FAILURE"}}}]},
                "reviews": {"totalCount": 1}
            },
            { # No approvals
                "number": 4,
                "author": {"login": "dependabot[bot]"},
                "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": "SUCCESS"}}}]},
                "reviews": {"totalCount": 0}
            },
            { # Valid
                "number": 5,
                "author": {"login": "renovate[bot]"},
                "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": "SUCCESS"}}}]},
                "reviews": {"totalCount": 2}
            }
        ]

        mock_response1 = MagicMock()
        mock_response1.json.return_value = self._mock_graphql_response(prs_page1, has_next_page=True, end_cursor="cursor1")
        mock_response1.raise_for_status.return_value = None

        mock_response2 = MagicMock()
        mock_response2.json.return_value = self._mock_graphql_response(prs_page2)
        mock_response2.raise_for_status.return_value = None

        mock_post.side_effect = [mock_response1, mock_response2]

        result = get_ready_to_merge_prs()
        self.assertEqual(result, "[1, 5]")

if __name__ == '__main__':
    unittest.main()
