// Types for SCIM 2.0 implementation
// RFC 7643

export interface ScimMeta {
    resourceType: string;
    created: string;
    lastModified: string;
    location: string;
    version: string;
}

export interface ScimResource {
    schemas: string[];
    id: string;
    externalId?: string;
    meta: ScimMeta;
}

export interface ScimEmail {
    value: string;
    type?: string;
    primary?: boolean;
}

export interface ScimName {
    formatted?: string;
    familyName: string;
    givenName: string;
    middleName?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
}

export interface ScimGroupMember {
    value: string; // User ID
    $ref: string;
    display?: string;
}

export interface ScimUser extends ScimResource {
    userName: string;
    name: ScimName;
    displayName?: string;
    emails: ScimEmail[];
    groups?: ScimGroupMember[];
    active?: boolean;
    roles?: string[]; // Custom extension or mapping
}

export interface ScimGroup extends ScimResource {
    displayName: string;
    members: ScimGroupMember[];
}

export interface ScimListResponse<T> {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"];
    totalResults: number;
    startIndex: number;
    itemsPerPage: number;
    Resources: T[];
}

export interface ScimError {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"];
    status: string;
    scimType?: string;
    detail?: string;
}

export interface ScimPatchOperation {
    op: 'add' | 'remove' | 'replace';
    path?: string;
    value?: any;
}

export interface ScimPatchRequest {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"];
    Operations: ScimPatchOperation[];
}

export interface ScimBulkOperation {
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    bulkId?: string;
    path: string;
    data?: any;
    location?: string;
    response?: any;
    status?: string;
}

export interface ScimBulkRequest {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"];
    failOnErrors?: number;
    Operations: ScimBulkOperation[];
}

export interface ScimBulkResponse {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkResponse"];
    Operations: ScimBulkOperation[];
}
