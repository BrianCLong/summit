# Release Policy and Freeze Windows

This document outlines how to manage the release policy, including the configuration of release freeze windows.

## Editing the Release Policy

The release policy is defined in the `release-policy.yml` file at the root of the repository. This file controls various aspects of the release process, including the default release branch and release freeze windows.

### Validating the Policy

Before committing any changes to `release-policy.yml`, it is important to validate the file to ensure it is well-formed. You can do this by running the following command:

```bash
pnpm lint:release-policy
```

This command will check the syntax and structure of the file and report any errors.
