// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

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
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "main", "symbols": ["statement"], "postprocess": id},
    {"name": "statement$subexpression$1", "symbols": ["find_statement"]},
    {"name": "statement$subexpression$1", "symbols": ["count_statement"]},
    {"name": "statement", "symbols": ["statement$subexpression$1"], "postprocess": id},
    {"name": "find_statement$ebnf$1$subexpression$1", "symbols": ["__", "where_clause"]},
    {"name": "find_statement$ebnf$1", "symbols": ["find_statement$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "find_statement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "find_statement", "symbols": [(lexer.has("find") ? {type: "find"} : find), "__", (lexer.has("identifier") ? {type: "identifier"} : identifier), "find_statement$ebnf$1"], "postprocess":
        ([,, label, where_clause]) => ({
          type: 'find',
          label: label.value,
          filter: where_clause ? where_clause[1] : null,
        })
        },
    {"name": "count_statement$ebnf$1$subexpression$1", "symbols": ["__", "where_clause"]},
    {"name": "count_statement$ebnf$1", "symbols": ["count_statement$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "count_statement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "count_statement", "symbols": [(lexer.has("count") ? {type: "count"} : count), "__", (lexer.has("identifier") ? {type: "identifier"} : identifier), "count_statement$ebnf$1"], "postprocess":
        ([,, label, where_clause]) => ({
          type: 'count',
          label: label.value,
          filter: where_clause ? where_clause[1] : null,
        })
        },
    {"name": "where_clause$subexpression$1", "symbols": [(lexer.has("is") ? {type: "is"} : is)]},
    {"name": "where_clause$subexpression$1", "symbols": [(lexer.has("equals") ? {type: "equals"} : equals)]},
    {"name": "where_clause", "symbols": [(lexer.has("where") ? {type: "where"} : where), "__", (lexer.has("identifier") ? {type: "identifier"} : identifier), "__", "where_clause$subexpression$1", "__", (lexer.has("string") ? {type: "string"} : string)], "postprocess":
        ([,, property,, , , value]) => ({
          property: property.value,
          value: value.value.slice(1, -1),
        })
        },
    {"name": "__$ebnf$1", "symbols": []},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"]}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
