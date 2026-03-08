"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scimService = exports.ScimService = void 0;
const database_js_1 = require("../../config/database.js");
const UserManagementService_js_1 = require("../UserManagementService.js");
const crypto_1 = require("crypto");
const SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const SCIM_GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
class ScimService {
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    mapUserToScim(user) {
        return {
            schemas: [SCIM_USER_SCHEMA],
            id: user.id,
            externalId: user.id, // Or separate externalId if supported
            meta: {
                resourceType: 'User',
                created: user.createdAt.toISOString(),
                lastModified: user.updatedAt.toISOString(),
                location: `/scim/v2/Users/${user.id}`,
                version: `W/"${new Date(user.updatedAt).getTime()}"`
            },
            // Prefer username if set, otherwise email
            userName: user.username || user.email,
            name: {
                familyName: user.lastName,
                givenName: user.firstName,
                formatted: `${user.firstName} ${user.lastName}`
            },
            displayName: `${user.firstName} ${user.lastName}`,
            emails: [
                {
                    value: user.email,
                    type: 'work',
                    primary: true
                }
            ],
            active: user.isActive,
            roles: [user.role] // Custom mapping
        };
    }
    mapGroupToScim(group, members = []) {
        return {
            schemas: [SCIM_GROUP_SCHEMA],
            id: group.id,
            externalId: group.external_id,
            displayName: group.display_name,
            meta: {
                resourceType: 'Group',
                created: group.created_at.toISOString(),
                lastModified: group.updated_at.toISOString(),
                location: `/scim/v2/Groups/${group.id}`,
                version: `W/"${new Date(group.updated_at).getTime()}"`
            },
            members: members.map(m => ({
                value: m.user_id,
                $ref: `/scim/v2/Users/${m.user_id}`,
                display: m.email // Optional
            }))
        };
    }
    parseFilter(filter) {
        if (!filter)
            return null;
        // Simple regex for 'field eq "value"'
        const match = filter.match(/([\w.]+)[\s]+eq[\s]+"([^"]+)"/);
        if (match) {
            return { field: match[1], value: match[2] };
        }
        return null;
    }
    parseSort(sortBy, sortOrder) {
        let mappedSort = 'createdAt';
        if (sortBy) {
            if (sortBy === 'userName')
                mappedSort = 'email'; // Approximate
            else if (sortBy === 'name.givenName')
                mappedSort = 'firstName';
            else if (sortBy === 'name.familyName')
                mappedSort = 'lastName';
            else if (sortBy === 'emails')
                mappedSort = 'email';
        }
        let mappedOrder = 'desc';
        if (sortOrder && sortOrder.toLowerCase() === 'asc')
            mappedOrder = 'asc';
        return { sortBy: mappedSort, sortOrder: mappedOrder };
    }
    // --- Users ---
    async listUsers(tenantId, startIndex = 1, count = 100, filter, sortBy, sortOrder) {
        const filterObj = this.parseFilter(filter);
        let search = undefined;
        // Map userName/email filter to search
        if (filterObj && (filterObj.field === 'userName' || filterObj.field === 'emails' || filterObj.field === 'emails.value')) {
            search = filterObj.value;
        }
        const sortParams = this.parseSort(sortBy, sortOrder);
        const result = await UserManagementService_js_1.userManagementService.listUsers(tenantId, {
            page: Math.floor((startIndex - 1) / count) + 1,
            pageSize: count,
            search: search,
            sortBy: sortParams.sortBy,
            sortOrder: sortParams.sortOrder
        }, 'scim-service');
        let users = result.data.users.map(u => this.mapUserToScim(u));
        // In-memory refinement for exact match if filtering by userName/email
        // This is to strictly comply with "eq" even if the DB search is "contains"
        if (filterObj && (filterObj.field === 'userName' || filterObj.field === 'emails' || filterObj.field === 'emails.value')) {
            const exactMatch = users.find(u => u.userName === filterObj.value ||
                u.emails.some(e => e.value === filterObj.value));
            if (exactMatch) {
                users = [exactMatch];
            }
            else {
                // If specific filter was requested but no exact match found, return empty
                // Only if we are sure the search param was used.
                if (search)
                    users = [];
            }
        }
        // Adjust total if we filtered in memory to a single result
        const total = (search && users.length <= 1) ? users.length : result.data.total;
        return {
            schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            totalResults: total,
            startIndex: startIndex,
            itemsPerPage: count,
            Resources: users
        };
    }
    async getUser(tenantId, userId) {
        const result = await UserManagementService_js_1.userManagementService.getUser(tenantId, userId, 'scim-service');
        if (!result.data)
            return null;
        return this.mapUserToScim(result.data);
    }
    async createUser(tenantId, user) {
        // Extract fields
        const email = user.emails?.find(e => e.primary)?.value || user.emails?.[0]?.value || user.userName;
        const firstName = user.name?.givenName || 'Unknown';
        const lastName = user.name?.familyName || 'Unknown';
        // Default password generation
        const tempPassword = (0, crypto_1.randomUUID)();
        const result = await UserManagementService_js_1.userManagementService.createUser(tenantId, {
            email,
            firstName,
            lastName,
            password: tempPassword,
            role: 'ANALYST', // Default role
            username: user.userName
        }, 'scim-service');
        if (!result.data.user) {
            throw new Error("Failed to create user: " + result.data.message);
        }
        return this.mapUserToScim(result.data.user);
    }
    async updateUser(tenantId, userId, user) {
        const firstName = user.name?.givenName;
        const lastName = user.name?.familyName;
        const email = user.emails?.find(e => e.primary)?.value;
        const result = await UserManagementService_js_1.userManagementService.updateUser(tenantId, userId, {
            firstName,
            lastName,
            email,
            isActive: user.active
        }, 'scim-service');
        if (!result.data.user) {
            throw new Error("Failed to update user: " + result.data.message);
        }
        return this.mapUserToScim(result.data.user);
    }
    async patchUser(tenantId, userId, patch) {
        // Fetch current user to apply patch
        const currentUserData = await this.getUser(tenantId, userId);
        if (!currentUserData)
            throw new Error("User not found");
        const updateData = {};
        for (const op of patch.Operations) {
            if (op.op === 'replace' || op.op === 'add') {
                // Handle specific paths
                if (op.path === 'active') {
                    updateData.isActive = op.value;
                }
                else if (op.path === 'name.givenName') {
                    updateData.firstName = op.value;
                }
                else if (op.path === 'name.familyName') {
                    updateData.lastName = op.value;
                }
                else if (op.path === 'userName') {
                    // Not supported via update currently in UserManagementService for username?
                    // But we can check. UserManagementService updateUserSchema doesn't have username.
                    // Assuming email logic.
                }
                else if (!op.path && typeof op.value === 'object') {
                    // Full object merge
                    if (op.value.active !== undefined)
                        updateData.isActive = op.value.active;
                    if (op.value.name) {
                        if (op.value.name.givenName)
                            updateData.firstName = op.value.name.givenName;
                        if (op.value.name.familyName)
                            updateData.lastName = op.value.name.familyName;
                    }
                }
            }
        }
        if (Object.keys(updateData).length > 0) {
            const result = await UserManagementService_js_1.userManagementService.updateUser(tenantId, userId, updateData, 'scim-service');
            if (!result.data.user) {
                throw new Error("Failed to patch user: " + result.data.message);
            }
            return this.mapUserToScim(result.data.user);
        }
        return currentUserData;
    }
    async deleteUser(tenantId, userId) {
        await UserManagementService_js_1.userManagementService.deleteUser(tenantId, userId, 'scim-service', false);
    }
    // --- Groups ---
    async listGroups(tenantId, startIndex = 1, count = 100, filter, sortBy, sortOrder) {
        const offset = startIndex - 1;
        const client = await this.pool.connect();
        try {
            let countQuery = 'SELECT COUNT(*) FROM scim_groups WHERE tenant_id = $1';
            let query = 'SELECT * FROM scim_groups WHERE tenant_id = $1';
            const params = [tenantId];
            const filterObj = this.parseFilter(filter);
            if (filterObj && filterObj.field === 'displayName') {
                countQuery += ' AND display_name = $2';
                query += ' AND display_name = $2';
                params.push(filterObj.value);
            }
            // Sorting
            let orderBy = 'created_at';
            if (sortBy === 'displayName')
                orderBy = 'display_name';
            const direction = (sortOrder && sortOrder.toLowerCase() === 'asc') ? 'ASC' : 'DESC';
            query += ` ORDER BY ${orderBy} ${direction}`;
            const countRes = await client.query(countQuery, params);
            const total = parseInt(countRes.rows[0].count, 10);
            // Add Limit and Offset
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(count, offset);
            const res = await client.query(query, params);
            const groups = await Promise.all(res.rows.map(async (row) => {
                const membersRes = await client.query('SELECT user_id FROM scim_group_members WHERE group_id = $1', [row.id]);
                return this.mapGroupToScim(row, membersRes.rows);
            }));
            return {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
                totalResults: total,
                startIndex: startIndex,
                itemsPerPage: count,
                Resources: groups
            };
        }
        finally {
            client.release();
        }
    }
    async getGroup(tenantId, groupId) {
        const client = await this.pool.connect();
        try {
            const res = await client.query('SELECT * FROM scim_groups WHERE id = $1 AND tenant_id = $2', [groupId, tenantId]);
            if (res.rows.length === 0)
                return null;
            const membersRes = await client.query('SELECT user_id FROM scim_group_members WHERE group_id = $1', [groupId]);
            return this.mapGroupToScim(res.rows[0], membersRes.rows);
        }
        finally {
            client.release();
        }
    }
    async createGroup(tenantId, group) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const res = await client.query('INSERT INTO scim_groups (tenant_id, display_name, external_id) VALUES ($1, $2, $3) RETURNING *', [tenantId, group.displayName, group.externalId]);
            const groupId = res.rows[0].id;
            if (group.members && group.members.length > 0) {
                for (const member of group.members) {
                    await client.query('INSERT INTO scim_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, member.value]);
                }
            }
            await client.query('COMMIT');
            // Re-fetch to return complete object
            return (await this.getGroup(tenantId, groupId));
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    async updateGroup(tenantId, groupId, group) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Check existence
            const check = await client.query('SELECT id FROM scim_groups WHERE id = $1 AND tenant_id = $2', [groupId, tenantId]);
            if (check.rows.length === 0)
                throw new Error("Group not found");
            // Update Metadata
            await client.query('UPDATE scim_groups SET display_name = $1, external_id = $2, updated_at = NOW() WHERE id = $3', [group.displayName, group.externalId, groupId]);
            // Replace Members
            await client.query('DELETE FROM scim_group_members WHERE group_id = $1', [groupId]);
            if (group.members && group.members.length > 0) {
                for (const member of group.members) {
                    await client.query('INSERT INTO scim_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, member.value]);
                }
            }
            await client.query('COMMIT');
            return (await this.getGroup(tenantId, groupId));
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    async deleteGroup(tenantId, groupId) {
        const client = await this.pool.connect();
        try {
            const res = await client.query('DELETE FROM scim_groups WHERE id = $1 AND tenant_id = $2', [groupId, tenantId]);
            if (res.rowCount === 0) {
                throw new Error("Group not found");
            }
        }
        finally {
            client.release();
        }
    }
    async patchGroup(tenantId, groupId, patch) {
        const client = await this.pool.connect();
        try {
            // Verify group exists
            const check = await client.query('SELECT id FROM scim_groups WHERE id = $1 AND tenant_id = $2', [groupId, tenantId]);
            if (check.rows.length === 0)
                throw new Error("Group not found");
            await client.query('BEGIN');
            for (const op of patch.Operations) {
                if (op.op === 'add') {
                    // Add members
                    // value can be [{value: "id", ...}] or {members: [{value: "id"}]}
                    let membersToAdd = [];
                    if (Array.isArray(op.value)) {
                        membersToAdd = op.value;
                    }
                    else if (op.value && op.value.members) {
                        membersToAdd = op.value.members;
                    }
                    for (const m of membersToAdd) {
                        if (m.value) {
                            await client.query('INSERT INTO scim_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, m.value]);
                        }
                    }
                }
                else if (op.op === 'remove') {
                    if (op.path && op.path.startsWith('members')) {
                        // remove specific members
                        // e.g. path="members[value eq "123"]"
                        const match = op.path.match(/members\[value eq "(.+?)"\]/);
                        if (match) {
                            const userIdToRemove = match[1];
                            await client.query('DELETE FROM scim_group_members WHERE group_id = $1 AND user_id = $2', [groupId, userIdToRemove]);
                        }
                        else if (op.path === 'members') {
                            // Remove all members? Or check value?
                            // Standard says "remove" with "members" removes all members
                            await client.query('DELETE FROM scim_group_members WHERE group_id = $1', [groupId]);
                        }
                    }
                }
                else if (op.op === 'replace') {
                    if (op.path === 'members' && Array.isArray(op.value)) {
                        // Replace all members
                        await client.query('DELETE FROM scim_group_members WHERE group_id = $1', [groupId]);
                        for (const m of op.value) {
                            if (m.value) {
                                await client.query('INSERT INTO scim_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, m.value]);
                            }
                        }
                    }
                    else if (op.value && op.value.displayName) {
                        await client.query('UPDATE scim_groups SET display_name = $1, updated_at = NOW() WHERE id = $2', [op.value.displayName, groupId]);
                    }
                }
            }
            await client.query('COMMIT');
            return (await this.getGroup(tenantId, groupId));
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    // --- Bulk ---
    async processBulk(tenantId, bulk) {
        const results = [];
        // Note: Simple sequential processing. A real implementation should handle dependencies (bulkId).
        for (const op of bulk.Operations) {
            const result = {
                method: op.method,
                bulkId: op.bulkId,
                status: "200"
            };
            try {
                // --- Users ---
                if (op.path.startsWith('/Users')) {
                    if (op.method === 'POST') {
                        const user = await this.createUser(tenantId, op.data);
                        result.status = "201";
                        result.location = user.meta.location;
                    }
                    else if (op.method === 'PUT') {
                        const id = op.path.split('/').pop();
                        await this.updateUser(tenantId, id, op.data);
                        result.status = "200";
                    }
                    else if (op.method === 'PATCH') {
                        const id = op.path.split('/').pop();
                        await this.patchUser(tenantId, id, { schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], Operations: op.data.Operations || [] });
                        result.status = "200";
                    }
                    else if (op.method === 'DELETE') {
                        const id = op.path.split('/').pop();
                        await this.deleteUser(tenantId, id);
                        result.status = "204";
                    }
                }
                // --- Groups ---
                else if (op.path.startsWith('/Groups')) {
                    if (op.method === 'POST') {
                        const group = await this.createGroup(tenantId, op.data);
                        result.status = "201";
                        result.location = group.meta.location;
                    }
                    else if (op.method === 'PUT') {
                        const id = op.path.split('/').pop();
                        await this.updateGroup(tenantId, id, op.data);
                        result.status = "200";
                    }
                    else if (op.method === 'PATCH') {
                        const id = op.path.split('/').pop();
                        await this.patchGroup(tenantId, id, op.data);
                        result.status = "200";
                    }
                    else if (op.method === 'DELETE') {
                        const id = op.path.split('/').pop();
                        await this.deleteGroup(tenantId, id);
                        result.status = "204";
                    }
                }
                else {
                    result.status = "404";
                    result.response = {
                        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                        status: "404",
                        detail: "Resource not found or not supported"
                    };
                }
            }
            catch (e) {
                const status = e.message.includes("not found") ? "404" : "500";
                result.status = status;
                result.response = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: status,
                    detail: e.message
                };
            }
            results.push(result);
        }
        return {
            schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkResponse"],
            Operations: results
        };
    }
}
exports.ScimService = ScimService;
exports.scimService = new ScimService();
