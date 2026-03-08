"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MagicSearch;
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const ENTITY_SUGGESTIONS = ['APT actor', 'campaign', 'target', 'malware'];
const RELATION_SUGGESTIONS = ['linked to', 'associated with', 'targets'];
const EXAMPLE = 'Show all APT actors linked to finance-themed targets';
function parseNaturalQuery(text) {
    const m = /show all (.+) linked to (.+)-themed targets/i.exec(text);
    if (m) {
        const theme = m[2];
        return {
            query: (0, client_1.gql) `
        query ($theme: String!) {
          aptActors(filter: { targetTheme: $theme }) {
            id
            name
          }
        }
      `,
            variables: { theme },
        };
    }
    return null;
}
function MagicSearch() {
    const client = (0, client_1.useApolloClient)();
    const [input, setInput] = (0, react_1.useState)('');
    const [graphql, setGraphql] = (0, react_1.useState)('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [results, setResults] = (0, react_1.useState)([]);
    const options = [...ENTITY_SUGGESTIONS, ...RELATION_SUGGESTIONS];
    const runSearch = async () => {
        const parsed = parseNaturalQuery(input);
        if (!parsed)
            return;
        setGraphql(parsed.query.loc?.source.body || '');
        try {
            const { data } = await client.query({
                query: parsed.query,
                variables: parsed.variables,
            });
            setResults(data?.aptActors || []);
        }
        catch (err) {
            console.error(err);
        }
    };
    return (<material_1.Box sx={{ p: 2 }}>
      <material_1.Autocomplete freeSolo options={options} inputValue={input} onInputChange={(_, v) => setInput(v)} renderInput={(params) => (<material_1.TextField {...params} label="Magic Search" placeholder="Ask in natural language" helperText={`Try: ${EXAMPLE}`} onKeyDown={(e) => {
                if (e.key === 'Enter')
                    runSearch();
            }} fullWidth/>)}/>

      {graphql && (<material_1.Box sx={{ mt: 2 }}>
          <material_1.Typography variant="subtitle2">Generated GraphQL query</material_1.Typography>
          <pre>{graphql}</pre>
        </material_1.Box>)}

      {results.length > 0 && (<material_1.List>
          {results.map((r) => (<material_1.ListItem key={r.id}>
              <material_1.ListItemText primary={r.name || r.id}/>
            </material_1.ListItem>))}
        </material_1.List>)}
    </material_1.Box>);
}
