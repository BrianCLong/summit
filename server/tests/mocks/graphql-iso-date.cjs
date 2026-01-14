class GraphQLDateTime {
  serialize(value) {
    return value;
  }
  parseValue(value) {
    return value;
  }
  parseLiteral(ast) {
    return ast && ast.value;
  }
}

module.exports = { GraphQLDateTime };
