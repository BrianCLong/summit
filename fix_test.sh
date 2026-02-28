#!/bin/bash

# Fix test error "You are trying to import a file after the Jest environment has been torn down."
# The issue usually comes from mock usage or timer issues.
sed -i 's/jest.fn().mockImplementation((text: string, _params: any\[\]) => {/jest.fn().mockImplementation((text: string, _params: any[]) => Promise.resolve({ rowCount: 0, rows: [] })); \/\//g' server/tests/mocks/pg.ts
sed -i 's/query: jest.fn().mockImplementation((text: string, params: any\[\]) => mockClient.query(text, params)),/query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),/g' server/tests/mocks/pg.ts
sed -i 's/read: jest.fn().mockImplementation((text: string, params: any\[\]) => mockClient.query(text, params)),/read: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),/g' server/tests/mocks/pg.ts
sed -i 's/write: jest.fn().mockImplementation((text: string, params: any\[\]) => mockClient.query(text, params)),/write: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),/g' server/tests/mocks/pg.ts
