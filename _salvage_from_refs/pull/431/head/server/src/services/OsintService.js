/**
 * OSINT scraping service integrating dark web and social media sources
 * Provides OAuth2-based access, RBAC checks, and audit logging
 */

import { writeAudit } from "../utils/audit.js";

export default class OsintService {
  constructor(logger) {
    this.logger = logger;
  }

  async fetchDarkWeb(query, { token, user } = {}) {
    this.#checkAccess(user, "DARK_WEB_READ");
    await writeAudit({
      userId: user?.id,
      action: "OSINT_DARKWEB_FETCH",
      resourceType: "osint",
      resourceId: query,
      details: { query },
    });
    const res = await fetch(
      `https://dark.api/search?q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return res.json();
  }

  async fetchSocialMedia(query, { token, user } = {}) {
    this.#checkAccess(user, "SOCIAL_MEDIA_READ");
    await writeAudit({
      userId: user?.id,
      action: "OSINT_SOCIAL_FETCH",
      resourceType: "osint",
      resourceId: query,
      details: { query },
    });
    const res = await fetch(
      `https://social.api/search?q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return res.json();
  }

  #checkAccess(user, permission) {
    const roles = user?.roles || [];
    if (!roles.includes(permission)) {
      this.logger?.warn?.(`Access denied for permission ${permission}`);
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
  }
}
