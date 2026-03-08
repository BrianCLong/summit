const item = { node_id: "I_kwDXXXXX", title: "Test", body: "Test body", created_at: new Date().toISOString() };
const added = { addProjectV2ItemById: { item: { id: "PVTI_lADOXXXXXX" } } };
const projectItemId = added.addProjectV2ItemById.item.id;
console.log(projectItemId);
