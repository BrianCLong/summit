# Release Process

This document outlines the steps to release a new version of the IntelGraph Platform.

## 1. Preparation

- Verify `CHANGELOG.md` is up-to-date with all changes.
- Update `package.json` version in:
  - Root `package.json`
  - `server/package.json`
  - `client/package.json`
- Update `CHANGELOG.md` with the release date and version.
- Create a Release Notes file (e.g., `RELEASE_NOTES_vX.Y.Z.md`) with the summary and changes.

## 2. Commit

Commit the changes with a message indicating the release.

```bash
git add .
git commit -m "chore(release): bump version to X.Y.Z"
```

## 3. Tag

Create an annotated git tag for the release.

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z: <Summary>"
```

## 4. Push

Push the commit and the tag to the repository.

```bash
git push origin main
git push origin vX.Y.Z
```

## 5. GitHub Release

- Navigate to the GitHub repository Releases page.
- Click "Draft a new release".
- Choose the tag `vX.Y.Z`.
- Paste the content from `RELEASE_NOTES_vX.Y.Z.md`.
- Publish the release.

## 6. Verification

- Verify the CI/CD pipelines run successfully for the tag.
- Check the deployed environment (if applicable).
