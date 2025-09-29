let tagRoleMap = {
  restricted: ["ADMIN"],
  "intel-only": ["ADMIN", "ANALYST"],
};

function getTagRoleMap() {
  return tagRoleMap;
}

function setTagRoleMap(map = {}) {
  tagRoleMap = map;
}

function userHasTagAccess(user, tags = []) {
  if (!tags.length) return true;
  const role = user?.role || "";
  return tags.every((tag) => {
    const allowed = tagRoleMap[tag];
    return !allowed || allowed.includes(role);
  });
}

function assertTagAccess(user, tags = []) {
  if (!userHasTagAccess(user, tags)) {
    const err = new Error("Access denied");
    err.code = "FORBIDDEN";
    throw err;
  }
}

function filterEntities(entities = [], user) {
  return entities.filter((e) => userHasTagAccess(user, e.tags || []));
}

module.exports = {
  getTagRoleMap,
  setTagRoleMap,
  userHasTagAccess,
  assertTagAccess,
  filterEntities,
};
