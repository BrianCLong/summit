# Granting Access to GitHub Projects (v2) Board

This guide provides a comprehensive step-by-step process for granting access to GitHub Projects (v2) boards, covering organization and user projects, visibility settings, permissions, and troubleshooting.

## Table of Contents

- [Organization vs User Projects](#organization-vs-user-projects)
- [Project Visibility Settings](#project-visibility-settings)
- [Base Role Permissions](#base-role-permissions)
- [Inviting Teams and Individual Users](#inviting-teams-and-individual-users)
- [Repository-Access Dependency for Item Visibility](#repository-access-dependency-for-item-visibility)
- [CLI Limitations with GitHub Projects Access](#cli-limitations-with-github-projects-access)
- [Troubleshooting Tips](#troubleshooting-tips)
- [Copy/Paste Checklist for Access Configuration](#copypaste-checklist-for-access-configuration)
- [References](#references)

---

## Organization vs User Projects

GitHub Projects (v2) can exist at two different scopes:

### Organization Projects

- **Scope**: Owned by a GitHub organization
- **Access Control**: Managed by organization owners and members with appropriate permissions
- **Visibility**: Can be set to public, internal (visible to all organization members), or private
- **Team Integration**: Can grant access to entire teams within the organization
- **Use Case**: Best for collaborative team projects where multiple repositories and team members need coordinated access

### User Projects

- **Scope**: Owned by an individual GitHub user account
- **Access Control**: Managed solely by the user account owner
- **Visibility**: Can be set to public or private (no internal option)
- **Collaboration**: Can grant access to individual collaborators but not to teams
- **Use Case**: Best for personal projects, portfolio management, or individual task tracking

**Key Difference**: Organization projects support team-based access control and internal visibility, while user projects are limited to individual collaborator management.

---

## Project Visibility Settings

Project visibility determines who can view and interact with your project board:

### Public

- Anyone on the internet can view the project
- Useful for open-source projects and public roadmaps
- Write access still requires explicit permission

### Internal (Organization projects only)

- All organization members can view the project
- Non-members cannot see the project
- Ideal for internal company projects

### Private

- Only users and teams explicitly granted access can view the project
- Default setting for new projects
- Best for sensitive or confidential project work

**To change visibility**:

1. Navigate to your project board
2. Click the **⋯** (menu) button in the top-right
3. Select **Settings**
4. Under **Visibility**, choose your desired option
5. Click **Save changes**

---

## Base Role Permissions

When granting access to a project, users receive one of the following base roles:

### Read

- Can view the project and its items
- Cannot make any changes
- Cannot add or edit items

### Write

- Can view and edit the project
- Can add, edit, and remove items
- Can modify field values and views
- Cannot change project settings or manage access

### Admin

- Full control over the project
- Can modify all project settings
- Can manage access and permissions for other users
- Can delete the project

**Note**: A user's effective permissions may be limited by their repository access for items linked to specific repositories (see [Repository-Access Dependency](#repository-access-dependency-for-item-visibility)).

---

## Inviting Teams and Individual Users

### For Organization Projects

#### Inviting Teams:

1. Open your project board
2. Click the **⋯** (menu) button in the top-right
3. Select **Settings**
4. Scroll to **Manage access**
5. Click **Invite teams**
6. Search for the team name
7. Select the team from the dropdown
8. Choose the base role (Read, Write, or Admin)
9. Click **Invite**

#### Inviting Individual Users:

1. Open your project board
2. Click the **⋯** (menu) button in the top-right
3. Select **Settings**
4. Scroll to **Manage access**
5. Click **Invite collaborators**
6. Enter the GitHub username or email
7. Select the user from the dropdown
8. Choose the base role (Read, Write, or Admin)
9. Click **Invite**

### For User Projects

1. Open your project board
2. Click the **⋯** (menu) button in the top-right
3. Select **Settings**
4. Scroll to **Manage access**
5. Click **Invite collaborators**
6. Enter the GitHub username
7. Choose the base role (Read, Write, or Admin)
8. Click **Invite**

**Important**: Invited users must accept the invitation before they can access the project.

---

## Repository-Access Dependency for Item Visibility

A critical aspect of GitHub Projects (v2) is that **item visibility depends on repository access**:

### How It Works

- Project items (issues, pull requests, draft issues) may be linked to repositories
- Users can only see items from repositories they have at least **read access** to
- Even if a user has **Admin** access to a project, they won't see items from repositories they can't access

### Example Scenario

- User A has **Write** access to ProjectBoard-X
- ProjectBoard-X contains items from three repositories:
  - `repo-public` (public repository)
  - `repo-internal` (internal repository)
  - `repo-private` (private repository)
- User A only has access to `repo-public` and `repo-internal`
- **Result**: User A will only see items from `repo-public` and `repo-internal` on the project board, even though they have Write access to the project itself

### Granting Repository Access

To ensure users can see all project items:

1. Identify which repositories are linked to project items
2. Grant users appropriate access to those repositories:
   - **For organization repositories**: Add users to teams with repository access, or grant individual access via repository settings
   - **For user repositories**: Add collaborators in repository settings
3. Verify that users have at least **read** permission on all relevant repositories

---

## CLI Limitations with GitHub Projects Access

GitHub Projects (v2) has limited support in the GitHub CLI and API:

### Known Limitations

- **No native `gh project` commands** for managing collaborator access in the CLI
- **GraphQL API required**: Access management must be done via the GitHub GraphQL API
- **Web UI recommended**: For most access management tasks, the web interface is the most straightforward option
- **Authentication scopes**: Some operations may require additional OAuth scopes or personal access tokens with `project` and `repo` permissions

### Alternative Approaches

- Use the **GitHub web UI** for managing project access (recommended)
- Use the **GraphQL API** with appropriate queries and mutations for automation:
  - `updateProjectV2` mutation for project settings
  - `updateProjectV2Collaborators` for managing access (if available)
- Consider using **GitHub Actions** for automated project management workflows

### Resources

- [GitHub GraphQL API documentation](https://docs.github.com/en/graphql)
- [Projects V2 GraphQL reference](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects)

---

## Troubleshooting Tips

### Users Can't See the Project

- **Check project visibility**: Ensure the project is not set to private if you expect broader access
- **Verify invitations**: Confirm that invited users have accepted their invitation
- **Organization membership**: For organization projects, ensure users are members of the organization
- **Check permissions**: Verify the user has been granted at least Read access

### Users Can't See Specific Items

- **Repository access**: Ensure users have access to the repositories linked to those items
- **Check item source**: Verify which repository the item comes from
- **Grant repository permissions**: Add users to the appropriate repositories or teams

### Users Can't Edit Items

- **Base role**: Ensure users have Write or Admin access to the project
- **Repository permissions**: Users need Write access to repositories to edit issues/PRs from those repos
- **Field permissions**: Some custom fields may have restrictions

### Invitations Not Received

- **Check email**: Ensure the user checks their GitHub notification email
- **Notification settings**: Users should verify their GitHub notification preferences
- **Re-send invitation**: Try removing and re-inviting the user
- **Username typo**: Double-check the GitHub username spelling

### Team Access Not Working

- **Team membership**: Verify the user is actually a member of the team
- **Team sync delays**: Team membership changes may take a few minutes to propagate
- **Organization membership**: Ensure users are organization members before adding them to teams

### Permissions Not Taking Effect

- **Refresh the page**: Sometimes a browser refresh is needed
- **Wait for propagation**: Permission changes can take 1-2 minutes to take effect
- **Check conflicting permissions**: Higher-level permissions may override project-level access
- **Audit logs**: Review organization audit logs for permission changes

---

## Copy/Paste Checklist for Access Configuration

Use this checklist when setting up project access:

```markdown
## Project Access Configuration Checklist

### Initial Setup

- [ ] Determine project scope (organization vs user)
- [ ] Create the project board
- [ ] Set project visibility (public/internal/private)
- [ ] Document which repositories will be linked to project items

### Team/User Access

- [ ] Identify teams that need access (organization projects only)
- [ ] Identify individual users that need access
- [ ] Determine appropriate base role for each team/user (Read/Write/Admin)
- [ ] Send invitations to all teams
- [ ] Send invitations to all individual users
- [ ] Follow up to ensure all invitations are accepted

### Repository Access

- [ ] List all repositories linked to project items
- [ ] Verify each user/team has access to relevant repositories
- [ ] Grant repository access where needed:
  - [ ] For organization repos: Add to teams or grant individual access
  - [ ] For user repos: Add as collaborators
- [ ] Confirm minimum read access on all linked repositories

### Verification

- [ ] Test project access with a team member from each role level
- [ ] Verify all project items are visible to appropriate users
- [ ] Confirm edit permissions work as expected
- [ ] Check that settings/admin functions are restricted appropriately

### Documentation

- [ ] Document the access configuration in project README or wiki
- [ ] Note any special permissions or exceptions
- [ ] Record which teams/users have which roles
- [ ] Include links to relevant repository access documentation

### Ongoing Maintenance

- [ ] Set up regular access reviews (quarterly recommended)
- [ ] Establish process for granting/revoking access
- [ ] Monitor audit logs for unexpected permission changes
- [ ] Update documentation when access policies change
```

---

## References

For authoritative information and detailed documentation, refer to the following GitHub resources:

### Primary GitHub Documentation

- [About Projects (v2)](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) - Overview of GitHub Projects features and capabilities
- [Managing access to projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-access-to-your-projects) - Official guide for project access management
- [Managing visibility of your projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-visibility-of-your-projects) - Detailed visibility settings documentation
- [Adding your project to a repository](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/adding-your-project-to-a-repository) - Linking projects to repositories
- [Best practices for projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects) - Recommended approaches for project management

### Repository Access

- [Managing access to organization repositories](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories) - Organization repository permissions
- [Managing teams and people with access to your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-teams-and-people-with-access-to-your-repository) - Repository collaborator management

### API and Automation

- [Using the API to manage projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects) - GraphQL API for Projects v2
- [GitHub GraphQL API](https://docs.github.com/en/graphql) - GraphQL API documentation

### Troubleshooting

- [Troubleshooting projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/troubleshooting-projects) - Common issues and solutions

---

**Document Version**: 1.0  
**Last Updated**: October 2025  
**Maintained By**: IntelGraph Platform Team
