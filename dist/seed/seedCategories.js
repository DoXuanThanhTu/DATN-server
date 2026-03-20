"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const category_model_1 = __importDefault(require("../models/category.model"));
const slugify_1 = __importDefault(require("slugify"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const categoriesData = [
    {
        name: "Xe cộ",
        icon: "car",
        order: 1,
        children: ["Ô tô", "Xe máy", "Xe tải, Xe khách", "Xe đạp", "Phụ tùng xe"],
    },
    {
        name: "Đồ điện tử",
        icon: "smartphone",
        order: 10,
        children: [
            "Điện thoại",
            "Máy tính bảng",
            "Laptop",
            "Máy tính để bàn",
            "Loa, Amply, Tivi",
        ],
    },
    {
        name: "Đồ gia dụng, nội thất, cây cảnh",
        icon: "sofa",
        order: 20,
        children: [
            "Bàn ghế",
            "Tủ, kệ gia đình",
            "Giường, chăn ga",
            "Cây cảnh, đồ trang trí",
        ],
    },
    {
        name: "Thời trang, đồ dùng cá nhân",
        icon: "shirt",
        order: 30,
        children: ["Quần áo", "Giày dép", "Túi xách", "Đồng hồ", "Trang sức"],
    },
];
const seedCategories = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");
        await category_model_1.default.deleteMany({});
        console.log("Cleared old categories.");
        for (const item of categoriesData) {
            const parent = await category_model_1.default.create({
                name: item.name,
                slug: (0, slugify_1.default)(item.name, { lower: true }),
                icon: item.icon,
                order: item.order,
                parentId: null,
            });
            console.log(`Added Parent: ${parent.name}`);
            if (item.children && item.children.length > 0) {
                const childPromises = item.children.map((childName, index) => {
                    return category_model_1.default.create({
                        name: childName,
                        slug: (0, slugify_1.default)(childName, { lower: true }),
                        parentId: parent._id,
                        order: index + 1,
                    });
                });
                await Promise.all(childPromises);
                console.log(`   --> Added ${item.children.length} children for ${parent.name}`);
            }
        }
        console.log("Seed data successfully!");
        process.exit();
    }
    catch (error) {
        console.error("Error seeding categories:", error);
        process.exit(1);
    }
};
seedCategories();
