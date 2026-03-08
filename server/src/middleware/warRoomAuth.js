"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWarRoomAdmin = exports.checkAuth = void 0;
// @ts-nocheck
const graphql_1 = require("graphql");
const db_js_1 = require("../db.js"); // Assuming a db connection utility exists
const checkAuth = (context) => {
    if (!context.user || !context.user.id) {
        throw new graphql_1.GraphQLError('User is not authenticated', {
            extensions: {
                code: 'UNAUTHENTICATED',
            },
        });
    }
};
exports.checkAuth = checkAuth;
const checkWarRoomAdmin = async (context, warRoomId) => {
    (0, exports.checkAuth)(context);
    const userId = context.user.id;
    const { rows } = await db_js_1.db.query('SELECT role FROM war_room_participants WHERE war_room_id = $1 AND user_id = $2', [warRoomId, userId]);
    const role = rows[0]?.role;
    if (role !== 'ADMIN') {
        throw new graphql_1.GraphQLError('User is not an admin of this War Room', {
            extensions: {
                code: 'FORBIDDEN',
            },
        });
    }
};
exports.checkWarRoomAdmin = checkWarRoomAdmin;
