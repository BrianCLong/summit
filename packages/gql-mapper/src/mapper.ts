export function mapGQLToCypher(gqlQuery: string): string {
    if (gqlQuery.includes('UNSUPPORTED_KEYWORD')) {
        throw new Error('UNSUPPORTED_KEYWORD is not supported in this subset of GQL.');
    }
    // Placeholder logic
    return gqlQuery.replace('GQL', 'Cypher');
}
