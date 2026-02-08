import { GraphQLScalarType } from 'graphql';
import { AttachmentService } from '../services/AttachmentService.js';
import { Readable } from 'stream';

const service = new AttachmentService();

export const attachmentTypeDefs = `#graphql
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

const UploadScalar = new GraphQLScalarType({
  name: 'Upload',
  description:
    'Upload payload via variables (supports { filename, mimetype, data } base64).',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: () => null,
});

export const attachmentResolvers = {
  Upload: UploadScalar,
  Mutation: {
    async uploadAttachment(_: unknown, { file }: { file: Promise<any> }) {
      const upload = await file;
      let stream: Readable;
      if (typeof upload.createReadStream === 'function') {
        stream = upload.createReadStream();
      } else if (typeof upload.data === 'string') {
        stream = Readable.from(Buffer.from(upload.data, 'base64'));
      } else {
        throw new Error(
          'Upload payload must include createReadStream() or base64 data',
        );
      }
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
