"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachmentResolvers = exports.attachmentTypeDefs = void 0;
// graphql-upload-ts types are not properly exported, using any for now
const GraphQLUpload = null; // TODO: Fix graphql-upload-ts import
const AttachmentService_js_1 = require("../services/AttachmentService.js");
const service = new AttachmentService_js_1.AttachmentService();
exports.attachmentTypeDefs = `#graphql
  scalar Upload
  type AttachmentMeta {
    filename: String!
    mimeType: String!
    size: Int!
    sha256: String!
  }
  type Mutation {
    uploadAttachment(file: Upload!): AttachmentMeta!
  }
`;
exports.attachmentResolvers = {
    Upload: GraphQLUpload,
    Mutation: {
        async uploadAttachment(_, { file }) {
            const upload = await file;
            const stream = upload.createReadStream();
            const meta = await service.save(stream, {
                filename: upload.filename,
                mimeType: upload.mimetype,
            });
            return {
                filename: meta.filename,
                mimeType: meta.mimeType,
                size: meta.size,
                sha256: meta.sha256,
            };
        },
    },
};
