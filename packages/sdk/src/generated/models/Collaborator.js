"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collaborator = void 0;
var Collaborator;
(function (Collaborator) {
    let role;
    (function (role) {
        role["VIEWER"] = "viewer";
        role["EDITOR"] = "editor";
        role["ADMIN"] = "admin";
    })(role = Collaborator.role || (Collaborator.role = {}));
})(Collaborator || (exports.Collaborator = Collaborator = {}));
