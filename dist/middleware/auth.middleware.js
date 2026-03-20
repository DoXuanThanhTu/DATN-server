"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.checkAuth = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập!" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const currentUser = await user_model_1.default.findById(decoded.id).select("-password");
        if (!currentUser) {
            return res.status(401).json({ message: "Người dùng không còn tồn tại" });
        }
        req.user = currentUser;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn" });
    }
};
exports.protect = protect;
const checkAuth = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        next();
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const currentUser = await user_model_1.default.findById(decoded.id).select("-password");
        if (!currentUser) {
            return res.status(401).json({ message: "Người dùng không còn tồn tại" });
        }
        req.user = currentUser;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn" });
    }
};
exports.checkAuth = checkAuth;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Quyền '${req.user?.role}' không thể thực hiện hành động này!`,
            });
        }
        next();
    };
};
exports.authorize = authorize;
