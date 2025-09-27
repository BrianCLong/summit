# Okta/Entra ID Setup Runbook for IntelGraph SSO

This runbook outlines the steps to configure Okta or Entra ID (Azure AD) as an Identity Provider (IdP) for IntelGraph's Single Sign-On (SSO) functionality.

## 1. Prerequisites

*   Admin access to your Okta or Entra ID tenant.
*   IntelGraph tenant ID and SP metadata URL (available in IntelGraph Admin UI).

## 2. Okta Setup

### 2.1 Create a New Application Integration

1.  Log in to your Okta admin console.
2.  Navigate to **Applications** > **Applications**.
3.  Click **Create App Integration**.
4.  Select **SAML 2.0** as the Sign-on method and click **Next**.

### 2.2 General Settings

1.  **App name:** `IntelGraph SSO`
2.  **App logo:** (Optional) Upload IntelGraph logo.
3.  Click **Next**.

### 2.3 Configure SAML

1.  **Single sign on URL:** Enter the ACS URL from IntelGraph SP metadata.
2.  **Audience URI (SP Entity ID):** Enter the Entity ID from IntelGraph SP metadata.
3.  **Name ID format:** `EmailAddress`
4.  **Application username:** `Email`
5.  **Attribute Statements (Optional, for ABAC mapping):**
    *   `name` (Basic) -> `user.displayName`
    *   `groups` (Basic) -> `user.groups` (Filter as needed)
6.  Click **Next**.

### 2.4 Feedback

1.  Select **I'm an Okta customer adding an internal app**.
2.  Click **Finish**.

### 2.5 Assign Users/Groups

1.  Go to the **Assignments** tab for the newly created application.
2.  Assign relevant users and/or groups who should have access to IntelGraph.

### 2.6 Get IdP Metadata

1.  Go to the **Sign On** tab.
2.  Click **View Setup Instructions**.
3.  Copy the **Identity Provider metadata** XML content. You will upload this to IntelGraph.

## 3. Entra ID (Azure AD) Setup

### 3.1 Create a New Enterprise Application

1.  Log in to the Azure portal.
2.  Navigate to **Azure Active Directory** > **Enterprise applications**.
3.  Click **New application**.
4.  Click **Create your own application**.
5.  **What's the name of your app?** `IntelGraph SSO`
6.  Select **Integrate any other application you don't find in the gallery (Non-gallery)**.
7.  Click **Create**.

### 3.2 Configure Single Sign-On (SAML)

1.  From the application's overview, click **Single sign-on**.
2.  Select **SAML**.

### 3.3 Basic SAML Configuration

1.  Click **Edit** for **Basic SAML Configuration**.
2.  **Identifier (Entity ID):** Add the Entity ID from IntelGraph SP metadata.
3.  **Reply URL (Assertion Consumer Service URL):** Add the ACS URL from IntelGraph SP metadata.
4.  Click **Save**.

### 3.4 User Attributes & Claims (Optional, for ABAC mapping)

1.  Click **Edit** for **User Attributes & Claims**.
2.  Add new claims as needed (e.g., `groups` for group-based access control).

### 3.5 Users and groups

1.  Go to **Users and groups** from the left navigation.
2.  Click **Add user/group** and assign relevant users and/or groups.

### 3.6 SAML Signing Certificate

1.  Under **SAML Signing Certificate**, click **Download** next to **Federation Metadata XML**.
2.  You will upload this XML file to IntelGraph.

## 4. Google Workspace (G Suite) Setup

### 4.1 Add a SAML App to your Google Admin Console

1.  Log in to your Google Admin console.
2.  Navigate to **Apps** > **Web and mobile apps**.
3.  Click **Add app** > **Add custom SAML app**.

### 4.2 App Details

1.  **App name:** `IntelGraph SSO`
2.  (Optional) Upload a logo and add a description.
3.  Click **Continue**.

### 4.3 Google Identity Provider details

1.  Download the **IDP metadata** file. You will upload this to IntelGraph.
2.  Click **Continue**.

### 4.4 Service Provider details

1.  **ACS URL:** Enter the ACS URL from IntelGraph SP metadata.
2.  **Entity ID:** Enter the Entity ID from IntelGraph SP metadata.
3.  **Start URL:** (Optional) Your IntelGraph login URL.
4.  **Name ID format:** `EMAIL`
5.  **Name ID:** `Basic Information > Primary email`
6.  Click **Continue**.

### 4.5 Attribute mapping (Optional, for ABAC mapping)

1.  Add any custom attributes you need to map (e.g., groups).
2.  Click **Finish**.

### 4.6 User Access

1.  Turn on the service for your users (e.g., for everyone or specific organizational units).

## 5. IntelGraph Configuration

1.  In the IntelGraph Admin UI, navigate to **Org Settings** > **SSO**.
2.  Upload the IdP metadata XML file downloaded from Okta, Entra ID, or Google Workspace.
3.  Configure any additional settings (e.g., SSO required, email domain allow-list).

## 6. Testing

1.  Initiate an SSO login from your IdP (Okta/Entra ID/Google Workspace) or from the IntelGraph login page.
2.  Verify that users are successfully provisioned (JIT) and assigned correct roles/attributes.

## 7. Troubleshooting

*   **SAML Tracer:** Use browser extensions like SAML Tracer to inspect SAML assertions.
*   **IntelGraph Logs:** Check IntelGraph server logs for SSO-related errors.
*   **IdP Logs:** Review Okta/Entra ID/Google Workspace system logs for authentication failures.
