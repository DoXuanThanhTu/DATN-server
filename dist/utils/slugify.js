"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slugify = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
};
exports.default = slugify;
