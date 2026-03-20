"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = void 0;
const crypto_1 = __importDefault(require("crypto"));
const getAuth = (req, res) => {
    const token = crypto_1.default.randomBytes(16).toString("hex");
    const expire = Math.floor(Date.now() / 1000) + 300;
    const signature = crypto_1.default
        .createHmac("sha1", process.env.IMAGEKIT_PRIVATE)
        .update(token + expire)
        .digest("hex");
    res.json({
        publicKey: process.env.IMAGEKIT_PUBLIC,
        token,
        expire,
        signature,
    });
};
exports.getAuth = getAuth;
