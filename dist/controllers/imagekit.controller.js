"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePhoto = void 0;
const imagekit_1 = __importDefault(require("imagekit"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const imagekit = new imagekit_1.default({
    publicKey: process.env.IMAGEKIT_PUBLIC,
    privateKey: process.env.IMAGEKIT_PRIVATE,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});
const deletePhoto = async (req, res) => {
    try {
        const { fileId } = req.params;
        if (!fileId)
            return res.status(400).json({ success: false, message: "Thiếu fileId" });
        await imagekit.deleteFile(fileId);
        return res.status(200).json({ success: true, message: "Deleted" });
    }
    catch (error) {
        if (error.path === "deleteFile" &&
            error["$metadata"]?.httpStatusCode === 404) {
            return res
                .status(200)
                .json({ success: true, message: "Already deleted" });
        }
        return res.status(500).json({ success: false, error: error.message });
    }
};
exports.deletePhoto = deletePhoto;
