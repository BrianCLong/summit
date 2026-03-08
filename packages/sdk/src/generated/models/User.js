"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
var User;
(function (User) {
    let role;
    (function (role) {
        role["USER"] = "user";
        role["ANALYST"] = "analyst";
        role["ADMIN"] = "admin";
    })(role = User.role || (User.role = {}));
})(User || (exports.User = User = {}));
