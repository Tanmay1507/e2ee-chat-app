"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class GroupMember extends sequelize_1.Model {
}
GroupMember.init({
    groupId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    username: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'member',
    },
    encryptedGroupKey: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize: db_1.default,
    modelName: 'GroupMember',
    tableName: 'group_members',
});
exports.default = GroupMember;
