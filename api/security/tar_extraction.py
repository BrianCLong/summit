"""
Secure tar file extraction utilities.

This module provides secure methods for extracting tar archives with protection
against path traversal and arbitrary file write vulnerabilities (CVE-2025-4517).

Security Features:
- Path traversal prevention
- Absolute path rejection
- Symlink validation
- Safe member extraction
- Input validation
"""

import logging
import os
import tarfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class SecureTarExtractor:
    """Secure tar file extraction with vulnerability protections."""

    # Maximum path length to prevent DoS attacks
    MAX_PATH_LENGTH = 4096

    # Disallowed path components that indicate traversal attempts
    DISALLOWED_COMPONENTS = {"..", "~", "$", "`"}

    @staticmethod
    def _validate_path(path: str, base_dir: Path) -> bool:
        """
        Validate that a path is safe for extraction.

        Args:
            path: The path to validate
            base_dir: The base directory for extraction

        Returns:
            True if path is safe, False otherwise

        Raises:
            ValueError: If path is invalid
        """
        # Check path length
        if len(path) > SecureTarExtractor.MAX_PATH_LENGTH:
            raise ValueError(f"Path too long: {len(path)} > {SecureTarExtractor.MAX_PATH_LENGTH}")

        # Reject absolute paths
        if os.path.isabs(path):
            raise ValueError(f"Absolute paths not allowed: {path}")

        # Check for path traversal attempts
        for component in SecureTarExtractor.DISALLOWED_COMPONENTS:
            if component in path:
                raise ValueError(f"Disallowed path component '{component}' in path: {path}")

        # Resolve the full path and ensure it's within base_dir
        full_path = (base_dir / path).resolve()
        try:
            full_path.relative_to(base_dir.resolve())
        except ValueError:
            raise ValueError(f"Path traversal detected: {path}")

        return True

    @staticmethod
    def _validate_member(member: tarfile.TarInfo, base_dir: Path) -> bool:
        """
        Validate a tar member before extraction.

        Args:
            member: The tar member to validate
            base_dir: The base directory for extraction

        Returns:
            True if member is safe, False otherwise

        Raises:
            ValueError: If member is unsafe
        """
        # Validate the member name
        SecureTarExtractor._validate_path(member.name, base_dir)

        # Reject symlinks and hard links to prevent symlink attacks
        if member.issym() or member.islnk():
            raise ValueError(f"Symlinks and hard links not allowed: {member.name}")

        # Reject device files
        if member.ischr() or member.isblk():
            raise ValueError(f"Device files not allowed: {member.name}")

        # Reject FIFO files
        if member.isfifo():
            raise ValueError(f"FIFO files not allowed: {member.name}")

        return True

    @staticmethod
    def extract_safe(
        tar_path: str,
        extract_to: str,
        allowed_members: Optional[set[str]] = None,
        max_size: int = 1024 * 1024 * 1024,  # 1GB default
    ) -> int:
        """
        Safely extract a tar archive with comprehensive validation.

        Args:
            tar_path: Path to the tar file
            extract_to: Directory to extract to
            allowed_members: Optional set of allowed member names (whitelist)
            max_size: Maximum total size of extracted files in bytes

        Returns:
            Number of files extracted

        Raises:
            ValueError: If archive is unsafe
            tarfile.TarError: If tar operation fails
        """
        base_dir = Path(extract_to).resolve()
        base_dir.mkdir(parents=True, exist_ok=True)

        extracted_count = 0
        total_size = 0

        try:
            with tarfile.open(tar_path, "r:*") as tar:
                for member in tar.getmembers():
                    try:
                        # Check whitelist if provided
                        if allowed_members is not None and member.name not in allowed_members:
                            logger.warning(f"Member not in whitelist: {member.name}")
                            continue

                        # Validate member
                        SecureTarExtractor._validate_member(member, base_dir)

                        # Check size limits
                        if member.size > max_size:
                            raise ValueError(
                                f"File too large: {member.name} ({member.size} > {max_size})"
                            )

                        total_size += member.size
                        if total_size > max_size:
                            raise ValueError(
                                f"Total size exceeds limit: {total_size} > {max_size}"
                            )

                        # Safe extraction
                        tar.extract(member, path=extract_to)
                        extracted_count += 1
                        logger.info(f"Extracted: {member.name}")

                    except (ValueError, tarfile.TarError) as e:
                        logger.error(f"Failed to extract {member.name}: {e}")
                        raise

        except tarfile.TarError as e:
            logger.error(f"Tar operation failed: {e}")
            raise

        logger.info(f"Successfully extracted {extracted_count} files from {tar_path}")
        return extracted_count

    @staticmethod
    def extract_with_filter(
        tar_path: str,
        extract_to: str,
        filter_func,
        max_size: int = 1024 * 1024 * 1024,
    ) -> int:
        """
        Extract tar archive using a custom filter function.

        Args:
            tar_path: Path to the tar file
            extract_to: Directory to extract to
            filter_func: Function to filter members (returns True to extract)
            max_size: Maximum total size of extracted files in bytes

        Returns:
            Number of files extracted

        Raises:
            ValueError: If archive is unsafe
            tarfile.TarError: If tar operation fails
        """
        base_dir = Path(extract_to).resolve()
        base_dir.mkdir(parents=True, exist_ok=True)

        extracted_count = 0
        total_size = 0

        try:
            with tarfile.open(tar_path, "r:*") as tar:
                for member in tar.getmembers():
                    try:
                        # Apply custom filter
                        if not filter_func(member):
                            logger.debug(f"Member filtered out: {member.name}")
                            continue

                        # Validate member
                        SecureTarExtractor._validate_member(member, base_dir)

                        # Check size limits
                        if member.size > max_size:
                            raise ValueError(
                                f"File too large: {member.name} ({member.size} > {max_size})"
                            )

                        total_size += member.size
                        if total_size > max_size:
                            raise ValueError(
                                f"Total size exceeds limit: {total_size} > {max_size}"
                            )

                        # Safe extraction
                        tar.extract(member, path=extract_to)
                        extracted_count += 1
                        logger.info(f"Extracted: {member.name}")

                    except (ValueError, tarfile.TarError) as e:
                        logger.error(f"Failed to extract {member.name}: {e}")
                        raise

        except tarfile.TarError as e:
            logger.error(f"Tar operation failed: {e}")
            raise

        logger.info(f"Successfully extracted {extracted_count} files from {tar_path}")
        return extracted_count


def extract_tar_safe(
    tar_path: str,
    extract_to: str,
    allowed_members: Optional[set[str]] = None,
    max_size: int = 1024 * 1024 * 1024,
) -> int:
    """
    Convenience function for safe tar extraction.

    Args:
        tar_path: Path to the tar file
        extract_to: Directory to extract to
        allowed_members: Optional set of allowed member names (whitelist)
        max_size: Maximum total size of extracted files in bytes

    Returns:
        Number of files extracted

    Raises:
        ValueError: If archive is unsafe
        tarfile.TarError: If tar operation fails
    """
    return SecureTarExtractor.extract_safe(tar_path, extract_to, allowed_members, max_size)
