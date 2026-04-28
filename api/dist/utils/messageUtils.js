"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canModifyMessage = exports.TWENTY_FOUR_HOURS_MS = void 0;
exports.TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const canModifyMessage = (timestamp) => {
    const messageTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - messageTime) < exports.TWENTY_FOUR_HOURS_MS;
};
exports.canModifyMessage = canModifyMessage;
