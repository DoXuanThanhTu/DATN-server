"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategory = exports.getCategories = void 0;
const category_model_1 = __importDefault(require("../models/category.model"));
const slugify_1 = __importDefault(require("slugify"));
const getCategories = async (req, res) => {
    try {
        const categories = await category_model_1.default.find({ isActive: true })
            .sort({
            order: 1,
        })
            .select("name slug icon parentId order")
            .lean();
        const categoryTree = categories
            .filter((c) => !c.parentId)
            .map((parent) => ({
            ...parent,
            children: categories.filter((c) => c.parentId?.toString() === parent._id.toString()),
        }));
        res.json({ data: categoryTree });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
};
exports.getCategories = getCategories;
const createCategory = async (req, res) => {
    try {
        const { name, icon, parentId, order } = req.body;
        const slug = (0, slugify_1.default)(name, { lower: true });
        const newCategory = await category_model_1.default.create({
            name,
            slug,
            icon,
            parentId,
            order,
        });
        res.status(201).json({ data: newCategory });
    }
    catch (error) {
        if (error.code === 11000)
            return res.status(400).json({ message: "Danh mục đã tồn tại" });
        res.status(500).json({ message: error.message });
    }
};
exports.createCategory = createCategory;
