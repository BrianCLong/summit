
import { DSLQuery } from './execution.js';

/**
 * Custom Graph Query Language Parser
 * Syntax Example:
 * MATCH User(id="123") -> FOLLOWS -> User(name="Alice") RETURN COUNT(*)
 */
export class DSLParser {
    private pos = 0;
    private input = '';

    public parse(input: string): DSLQuery {
        this.input = input.trim();
        this.pos = 0;
        return this.parseQuery();
    }

    private parseQuery(): DSLQuery {
        const query: DSLQuery = { start: {} };

        // Expect MATCH
        this.consume('MATCH');

        // Parse Start Node
        query.start = this.parseNode();

        // Parse Traversals
        query.traverse = [];
        while (this.peek() === '-' || this.peek() === '<') {
            const traversal = this.parseTraversal();

            // Parse Target Node
            const targetNode = this.parseNode();

            // Merge target node info into traversal step
            if (targetNode.type || targetNode.filter) {
                traversal.target = {};
                if (targetNode.type) {traversal.target.type = targetNode.type;}
                if (targetNode.filter) {traversal.target.filter = targetNode.filter;}
            }

            query.traverse.push(traversal);
        }

        // Parse Return
        if (this.match('RETURN')) {
            if (this.match('COUNT(*)')) {
                query.aggregate = { field: '*', type: 'count' };
            } else {
                 // Try parsing specific field aggregation
                 // e.g., SUM(age)
                 const aggMatch = this.matchRegex(/^(COUNT|SUM|AVG)\(([a-zA-Z0-9_]+)\)/i);
                 if (aggMatch) {
                     query.aggregate = {
                         type: aggMatch[1].toLowerCase() as 'count' | 'sum' | 'avg',
                         field: aggMatch[2]
                     };
                 } else {
                     // Assume return node
                     // current DSL doesn't support generic RETURN clause well beyond aggregate or full node
                 }
            }
        }

        return query;
    }

    private parseNode(): { type?: string; id?: string; filter?: Record<string, any> } {
        const node: { type?: string; id?: string; filter?: Record<string, any> } = {};

        // Parse Type: User
        const typeMatch = this.matchRegex(/^([a-zA-Z0-9_]+)/);
        if (typeMatch) {
            node.type = typeMatch[1];
        }

        // Parse Properties: (id="123", name="Alice")
        if (this.peek() === '(') {
            this.consume('(');
            const props: Record<string, any> = {};
            while (this.peek() !== ')') {
                const keyMatch = this.matchRegex(/^([a-zA-Z0-9_]+)/);
                if (!keyMatch) {throw new Error(`Expected property key at ${this.pos}`);}
                const key = keyMatch[1];

                this.consume('=');

                const value = this.parseValue();
                props[key] = value;

                if (this.peek() === ',') {
                    this.consume(',');
                    this.consumeWhitespace();
                }
            }
            this.consume(')');

            // If property is 'id', map it to top-level id
            if (props.id) {
                node.id = props.id;
                delete props.id;
            }
            if (Object.keys(props).length > 0) {
                node.filter = props;
            }
        }

        this.consumeWhitespace();
        return node;
    }

    private parseTraversal(): { edgeTypes: string[]; direction: 'out' | 'in' | 'both'; target?: { type?: string; filter?: any } } {
        let direction: 'out' | 'in' | 'both' = 'out';

        // Check direction
        if (this.match('<-')) {
             direction = 'in';
        } else if (this.match('-')) {
             // Could be -> or -
        } else {
            throw new Error(`Expected traversal start at ${this.pos}`);
        }

        // Parse Edge: [FOLLOWS] or just FOLLOWS or nothing for any
        const edgeTypes: string[] = [];
        if (this.peek() === '[') {
            this.consume('[');
            const type = this.matchRegex(/^([a-zA-Z0-9_]+)/);
            if (type) {edgeTypes.push(type[1]);}
            this.consume(']');
        } else {
             // Try match raw edge type if not wrapped in []?
             // Syntax: -> FOLLOWS ->
             const type = this.matchRegex(/^([a-zA-Z0-9_]+)/);
             if (type) {edgeTypes.push(type[1]);}
        }

        // Check end of arrow
        if (this.match('->')) {
            if (direction === 'in') {direction = 'both';} // <-->
            else {direction = 'out';}
        } else if (this.match('-')) {
             if (direction === 'in') {direction = 'in';} // <--
             else {direction = 'both';} // -- (undirected/both)
        }

        this.consumeWhitespace();
        return { edgeTypes, direction };
    }

    private parseValue(): any {
        if (this.peek() === '"') {
            this.consume('"');
            const match = this.matchRegex(/^([^"]*)/);
            this.consume('"');
            return match ? match[1] : '';
        }
        // numeric
        const num = this.matchRegex(/^([0-9]+)/);
        if (num) {return parseInt(num[1], 10);}

        throw new Error(`Unexpected value at ${this.pos}`);
    }

    private peek(): string {
        return this.input[this.pos];
    }

    private consume(token: string) {
        if (this.input.startsWith(token, this.pos)) {
            this.pos += token.length;
            this.consumeWhitespace();
        } else {
            throw new Error(`Expected '${token}' at ${this.pos}, found '${this.input.substring(this.pos, this.pos + 10)}...'`);
        }
    }

    private match(token: string): boolean {
        if (this.input.startsWith(token, this.pos)) {
            this.pos += token.length;
            this.consumeWhitespace();
            return true;
        }
        return false;
    }

    private matchRegex(regex: RegExp): RegExpMatchArray | null {
        const substring = this.input.substring(this.pos);
        const match = substring.match(regex);
        if (match) {
            this.pos += match[0].length;
            this.consumeWhitespace();
            return match;
        }
        return null;
    }

    private consumeWhitespace() {
        const match = this.input.substring(this.pos).match(/^\s+/);
        if (match) {
            this.pos += match[0].length;
        }
    }
}
