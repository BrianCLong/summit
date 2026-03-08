import { jest } from '@jest/globals';

export const sendMock = jest.fn();

export const S3Client = jest.fn(() => {
  return {
    send: sendMock,
  };
});

export const PutObjectCommand = jest.fn();
export const ListObjectsV2Command = jest.fn();
export const DeleteObjectsCommand = jest.fn();
