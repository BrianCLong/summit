"""
Security tests for tar extraction and RCE vulnerability protections.

Tests for CVE-2025-4517 (tarfile arbitrary file write) and related vulnerabilities.
"""

import os
import tarfile
import tempfile
from pathlib import Path

import pytest

from api.security.tar_extraction import SecureTarExtractor, extract_tar_safe


class TestTarExtractionSecurity:
    """Test secure tar extraction against known vulnerabilities."""

    @pytest.fixture
    def temp_dirs(self):
        """Create temporary directories for testing."""
        with tempfile.TemporaryDirectory() as temp_dir:
            tar_dir = Path(temp_dir) / "tars"
            extract_dir = Path(temp_dir) / "extract"
            tar_dir.mkdir()
            extract_dir.mkdir()
            yield tar_dir, extract_dir

    def create_test_tar(self, tar_path: Path, members: dict) -> Path:
        """
        Create a test tar file with specified members.

        Args:
            tar_path: Path to create tar file at
            members: Dict of {filename: content} pairs

        Returns:
            Path to created tar file
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            for filename, content in members.items():
                file_path = temp_path / filename
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(content)

            with tarfile.open(tar_path, "w:gz") as tar:
                for filename in members.keys():
                    tar.add(temp_path / filename, arcname=filename)

        return tar_path

    def test_path_traversal_prevention(self, temp_dirs):
        """Test that path traversal attempts are blocked (CVE-2025-4517)."""
        tar_dir, extract_dir = temp_dirs

        # Create a tar with path traversal attempt
        tar_path = tar_dir / "traversal.tar.gz"
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            # Create a file that would traverse outside extract_dir
            traversal_file = temp_path / "../../etc/passwd"
            traversal_file.parent.mkdir(parents=True, exist_ok=True)
            traversal_file.write_text("malicious content")

            with tarfile.open(tar_path, "w:gz") as tar:
                tar.add(traversal_file, arcname="../../etc/passwd")

        # Attempt extraction should fail
        with pytest.raises(ValueError, match="Path traversal detected"):
            extract_tar_safe(str(tar_path), str(extract_dir))

    def test_absolute_path_rejection(self, temp_dirs):
        """Test that absolute paths are rejected."""
        tar_dir, extract_dir = temp_dirs

        # Create a tar with absolute path
        tar_path = tar_dir / "absolute.tar.gz"
        with tarfile.open(tar_path, "w:gz") as tar:
            # Manually add a member with absolute path
            info = tarfile.TarInfo(name="/etc/passwd")
            info.size = 0
            tar.addfile(info)

        # Attempt extraction should fail
        with pytest.raises(ValueError, match="Absolute paths not allowed"):
            extract_tar_safe(str(tar_path), str(extract_dir))

    def test_symlink_attack_prevention(self, temp_dirs):
        """Test that symlink attacks are prevented."""
        tar_dir, extract_dir = temp_dirs

        # Create a tar with symlinks
        tar_path = tar_dir / "symlinks.tar.gz"
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            file_path = temp_path / "file.txt"
            file_path.write_text("content")
            link_path = temp_path / "link.txt"
            link_path.symlink_to(file_path)

            with tarfile.open(tar_path, "w:gz") as tar:
                tar.add(file_path, arcname="file.txt")
                tar.add(link_path, arcname="link.txt")

        # Attempt extraction should fail on symlink
        with pytest.raises(ValueError, match="Symlinks and hard links not allowed"):
            extract_tar_safe(str(tar_path), str(extract_dir))

    def test_device_file_rejection(self, temp_dirs):
        """Test that device files are rejected."""
        tar_dir, extract_dir = temp_dirs

        # Create a tar with device file
        tar_path = tar_dir / "device.tar.gz"
        with tarfile.open(tar_path, "w:gz") as tar:
            # Manually add a character device
            info = tarfile.TarInfo(name="dev/null")
            info.type = tarfile.CHRTYPE
            info.devmajor = 1
            info.devminor = 3
            tar.addfile(info)

        # Attempt extraction should fail
        with pytest.raises(ValueError, match="Device files not allowed"):
            extract_tar_safe(str(tar_path), str(extract_dir))

    def test_safe_extraction(self, temp_dirs):
        """Test that safe files are extracted correctly."""
        tar_dir, extract_dir = temp_dirs

        # Create a safe tar
        tar_path = tar_dir / "safe.tar.gz"
        self.create_test_tar(tar_path, {"file1.txt": "content1", "file2.txt": "content2"})

        # Extract should succeed
        count = extract_tar_safe(str(tar_path), str(extract_dir))
        assert count == 2
        assert (extract_dir / "file1.txt").read_text() == "content1"
        assert (extract_dir / "file2.txt").read_text() == "content2"

    def test_whitelist_filtering(self, temp_dirs):
        """Test that whitelist filtering works correctly."""
        tar_dir, extract_dir = temp_dirs

        # Create a tar with multiple files
        tar_path = tar_dir / "whitelist.tar.gz"
        self.create_test_tar(
            tar_path,
            {
                "allowed.txt": "allowed content",
                "blocked.txt": "blocked content",
                "also_allowed.txt": "also allowed",
            },
        )

        # Extract with whitelist
        allowed = {"allowed.txt", "also_allowed.txt"}
        count = extract_tar_safe(str(tar_path), str(extract_dir), allowed_members=allowed)

        assert count == 2
        assert (extract_dir / "allowed.txt").exists()
        assert (extract_dir / "also_allowed.txt").exists()
        assert not (extract_dir / "blocked.txt").exists()

    def test_size_limit_enforcement(self, temp_dirs):
        """Test that size limits are enforced."""
        tar_dir, extract_dir = temp_dirs

        # Create a tar with a large file
        tar_path = tar_dir / "large.tar.gz"
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            large_file = temp_path / "large.bin"
            large_file.write_bytes(b"x" * (10 * 1024 * 1024))  # 10MB

            with tarfile.open(tar_path, "w:gz") as tar:
                tar.add(large_file, arcname="large.bin")

        # Extract with small size limit should fail
        with pytest.raises(ValueError, match="File too large"):
            extract_tar_safe(str(tar_path), str(extract_dir), max_size=1024 * 1024)  # 1MB

    def test_path_length_limit(self, temp_dirs):
        """Test that excessively long paths are rejected."""
        tar_dir, extract_dir = temp_dirs

        # Create a tar with very long path
        tar_path = tar_dir / "longpath.tar.gz"
        long_name = "a" * 5000  # Exceeds MAX_PATH_LENGTH
        with tarfile.open(tar_path, "w:gz") as tar:
            info = tarfile.TarInfo(name=long_name)
            info.size = 0
            tar.addfile(info)

        # Extraction should fail
        with pytest.raises(ValueError, match="Path too long"):
            extract_tar_safe(str(tar_path), str(extract_dir))

    def test_disallowed_components(self, temp_dirs):
        """Test that disallowed path components are rejected."""
        tar_dir, extract_dir = temp_dirs

        # Test various disallowed components
        disallowed_paths = [
            "file/../../../etc/passwd",
            "file/~/config",
            "file/$VAR/data",
            "file/`command`/data",
        ]

        for path in disallowed_paths:
            tar_path = tar_dir / f"disallowed_{hash(path)}.tar.gz"
            with tarfile.open(tar_path, "w:gz") as tar:
                info = tarfile.TarInfo(name=path)
                info.size = 0
                tar.addfile(info)

            with pytest.raises(ValueError, match="Disallowed path component"):
                extract_tar_safe(str(tar_path), str(extract_dir))


class TestRCEVulnerabilityProtections:
    """Test protections against RCE vulnerabilities."""

    def test_no_code_execution_on_extraction(self):
        """Test that extraction doesn't execute arbitrary code."""
        with tempfile.TemporaryDirectory() as temp_dir:
            tar_path = Path(temp_dir) / "test.tar.gz"
            extract_dir = Path(temp_dir) / "extract"
            extract_dir.mkdir()

            # Create a tar with a shell script
            script_dir = Path(temp_dir) / "scripts"
            script_dir.mkdir()
            script = script_dir / "script.sh"
            script.write_text("#!/bin/bash\necho 'This should not execute'")

            with tarfile.open(tar_path, "w:gz") as tar:
                tar.add(script, arcname="script.sh")

            # Extract
            extract_tar_safe(str(tar_path), str(extract_dir))

            # Verify file exists but wasn't executed
            extracted_script = extract_dir / "script.sh"
            assert extracted_script.exists()
            assert extracted_script.read_text() == "#!/bin/bash\necho 'This should not execute'"

    def test_input_validation(self):
        """Test that inputs are properly validated."""
        with tempfile.TemporaryDirectory() as temp_dir:
            extract_dir = Path(temp_dir) / "extract"
            extract_dir.mkdir()

            # Test with non-existent tar file
            with pytest.raises(Exception):  # FileNotFoundError or TarError
                extract_tar_safe("/nonexistent/file.tar.gz", str(extract_dir))

            # Test with invalid tar file
            invalid_tar = Path(temp_dir) / "invalid.tar.gz"
            invalid_tar.write_text("This is not a tar file")
            with pytest.raises(Exception):  # TarError
                extract_tar_safe(str(invalid_tar), str(extract_dir))


class TestPathValidation:
    """Test path validation logic."""

    def test_validate_path_safe_paths(self):
        """Test that safe paths pass validation."""
        base_dir = Path("/tmp/extract")
        safe_paths = [
            "file.txt",
            "dir/file.txt",
            "dir/subdir/file.txt",
            "file-with-dash.txt",
            "file_with_underscore.txt",
            "file.multiple.dots.txt",
        ]

        for path in safe_paths:
            assert SecureTarExtractor._validate_path(path, base_dir)

    def test_validate_path_unsafe_paths(self):
        """Test that unsafe paths fail validation."""
        base_dir = Path("/tmp/extract")
        unsafe_paths = [
            "/etc/passwd",  # Absolute
            "../../../etc/passwd",  # Traversal
            "file/../../etc/passwd",  # Traversal
            "~/config",  # Home reference
            "$VAR/data",  # Variable
            "`command`/data",  # Command substitution
        ]

        for path in unsafe_paths:
            with pytest.raises(ValueError):
                SecureTarExtractor._validate_path(path, base_dir)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
