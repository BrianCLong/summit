@{%
  const moo = require('moo');

  const lexer = moo.compile({
    WS: /[ \t]+/,
    NL: { match: /\n/, lineBreaks: true },
    find: /[Ff][Ii][Nn][Dd]/,
    count: /[Cc][Oo][Uu][Nn][Tt]/,
    where: /[Ww][Hh][Ee][Rr][Ee]/,
    is: /[Ii][Ss]/,
    equals: /=/,
    identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,
    string: /'[^']*'/,
  });
%}

@lexer lexer

main -> statement {% id %}

statement -> (
    find_statement
  | count_statement
) {% id %}

find_statement -> %find __ %identifier (__ where_clause):? {%
  ([,, label, where_clause]) => ({
    type: 'find',
    label: label.value,
    filter: where_clause ? where_clause[1] : null,
  })
%}

count_statement -> %count __ %identifier (__ where_clause):? {%
  ([,, label, where_clause]) => ({
    type: 'count',
    label: label.value,
    filter: where_clause ? where_clause[1] : null,
  })
%}

where_clause -> %where __ %identifier __ (%is | %equals) __ %string {%
  ([,, property,, , , value]) => ({
    property: property.value,
    value: value.value.slice(1, -1),
  })
%}

__ -> %WS:*
