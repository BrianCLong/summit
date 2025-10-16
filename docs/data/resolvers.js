// Resolvers for the documentation GraphQL API
const docs = [
  {
    id: 'doc1',
    title: 'Sample Document 1',
    content: 'This is the content of sample document 1.',
    path: '/docs/sample1',
    lastUpdated: '2025-09-07',
  },
  {
    id: 'doc2',
    title: 'Sample Document 2',
    content: 'This is the content of sample document 2.',
    path: '/docs/sample2',
    lastUpdated: '2025-09-07',
  },
];

const resolvers = {
  Query: {
    doc: (parent, { id }) => docs.find((doc) => doc.id === id),
    allDocs: () => docs,
  },
};

export default resolvers;
