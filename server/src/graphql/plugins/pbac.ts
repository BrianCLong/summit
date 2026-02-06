import type { ApolloServerPlugin } from '@apollo/server';
import type { GraphQLContext } from '../index.js';

const pbacPlugin = (): ApolloServerPlugin<GraphQLContext> => ({
    async requestDidStart() {
        return {
            async willSendResponse() { }
        };
    }
});

export default pbacPlugin;
