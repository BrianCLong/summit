import { jest } from '@jest/globals';

console.log('DEBUG: Manual mock loaded for @aws-sdk/client-s3');

export const __esModule = true;

export const sendMock = jest.fn();

export const S3Client = jest.fn(() => {
  console.log('DEBUG: S3Client mock constructor called');
  return {
    send: sendMock,
  };
});

export const PutObjectCommand = jest.fn();
export const ListObjectsV2Command = jest.fn();
export const DeleteObjectsCommand = jest.fn();
