export class GraphQLDateTime {
  serialize(value: unknown) {
    return value;
  }
  parseValue(value: unknown) {
    return value;
  }
  parseLiteral(ast: any) {
    return ast?.value;
  }
}
