/**
 * Type declarations for @aws-sdk/client-s3
 * This package is an optional dependency and dynamically imported
 */
declare module "@aws-sdk/client-s3" {
  import { Readable } from "stream";

  export interface S3ClientConfig {
    region?: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
    endpoint?: string;
    forcePathStyle?: boolean;
    [key: string]: any;
  }

  export class S3Client {
    constructor(config: S3ClientConfig);
    send(command: any): Promise<any>;
  }

  export interface ListObjectsV2CommandInput {
    Bucket: string;
    Prefix?: string;
    MaxKeys?: number;
    ContinuationToken?: string;
  }

  export class ListObjectsV2Command {
    constructor(input: ListObjectsV2CommandInput);
  }

  export interface GetObjectCommandInput {
    Bucket: string;
    Key: string;
  }

  export class GetObjectCommand {
    constructor(input: GetObjectCommandInput);
  }

  export interface GetObjectCommandOutput {
    Body?: Readable | ReadableStream<any> | Blob;
    ContentType?: string;
    ContentLength?: number;
  }
}
