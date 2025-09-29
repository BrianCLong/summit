const { readFileSync } = require('fs');
const path = require('path');
const gql = require('graphql-tag');

const publisherTypeDefs = gql(readFileSync(path.join(__dirname, 'schema', 'publisher.graphql'), 'utf8'));

module.exports = { publisherTypeDefs };
