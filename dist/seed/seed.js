"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../models/user.model"));
const post_model_1 = __importDefault(require("../models/post.model"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const seed = async () => {
    await mongoose_1.default.connect(process.env.MONGO_URI);
    await user_model_1.default.deleteMany();
    await post_model_1.default.deleteMany();
    const user = await user_model_1.default.create({
        email: "test@gmail.com",
        password: "123456",
    });
    await post_model_1.default.create([
        {
            title: "iPhone 11",
            price: 7000000,
            seller: user._id,
            location: { province: "Hà Nội" },
        },
        {
            title: "Macbook Pro",
            price: 15000000,
            seller: user._id,
            location: { province: "HCM" },
        },
    ]);
    console.log("Seed done");
    process.exit();
};
seed();
