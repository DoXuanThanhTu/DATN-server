"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = exports.getAllUsers = exports.updateStatus = exports.updateProfile = exports.getMe = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const review_model_1 = __importDefault(require("../models/review.model"));
const post_model_1 = __importDefault(require("../models/post.model"));
// Lấy thông tin cá nhân của người dùng hiện tại
const getMe = async (req, res) => {
    try {
        const user = await user_model_1.default.findById(req.user?._id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }
        res.status(200).json({ data: user });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
};
exports.getMe = getMe;
// Cập nhật thông tin hồ sơ
const updateProfile = async (req, res) => {
    try {
        const { name, phone, gender, address, avatar } = req.body;
        // Chuẩn bị object address khớp với IUser Model
        const addressUpdate = {
            provinceName: address?.provinceName || "",
            provinceCode: address?.provinceCode || "",
            wardName: address?.wardName || "",
            wardCode: address?.wardCode || "",
            detail: address?.detail || "",
            // Tự động tạo fullAddress nếu cần (tiện cho việc hiển thị sau này)
            fullAddress: [address?.detail, address?.wardName, address?.provinceName]
                .filter(Boolean)
                .join(", "),
        };
        const updatedUser = await user_model_1.default.findByIdAndUpdate(req.user?._id, {
            $set: {
                name,
                phone,
                gender,
                address: addressUpdate,
                avatar,
                lastActive: new Date(),
            },
        }, {
            returnDocument: "after", // Trả về data sau khi update
            runValidators: true, // Chạy validation của schema
        }).select("-password");
        if (!updatedUser) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
        res.status(200).json({
            message: "Cập nhật hồ sơ thành công",
            data: updatedUser,
        });
    }
    catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({
            message: "Lỗi cập nhật hồ sơ",
            error: error.message,
        });
    }
};
exports.updateProfile = updateProfile;
const updateStatus = async (req, res) => {
    try {
        await user_model_1.default.findByIdAndUpdate(req.user._id, {
            lastActive: new Date(),
        });
        res.sendStatus(200);
    }
    catch (error) {
        res.sendStatus(500);
    }
};
exports.updateStatus = updateStatus;
const getAllUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user?._id;
        const filteredUsers = await user_model_1.default.find({ _id: { $ne: loggedInUserId } })
            .select("-password")
            .sort({ createdAt: -1 });
        res.status(200).json(filteredUsers);
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách người dùng" });
    }
};
exports.getAllUsers = getAllUsers;
const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        // 1. USER INFO
        const user = await user_model_1.default.findById(userId).select("-password -__v");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        // 2. PRODUCTS (chỉ lấy active + sold giống Shopee)
        const products = await post_model_1.default.find({
            seller: userId,
            status: { $in: ["active", "sold"] },
        })
            .select("title price images status createdAt")
            .sort({ createdAt: -1 })
            .limit(10);
        const totalProducts = await post_model_1.default.countDocuments({
            seller: userId,
        });
        // 3. REVIEWS (người khác đánh giá user này)
        const reviews = await review_model_1.default.find({
            reviewee: userId,
        })
            .populate("reviewer", "name avatar")
            .sort({ createdAt: -1 })
            .limit(10);
        const totalReviews = await review_model_1.default.countDocuments({
            reviewee: userId,
        });
        // 4. RATING AVG
        const ratingAgg = await review_model_1.default.aggregate([
            { $match: { reviewee: user._id } },
            {
                $group: {
                    _id: "$reviewee",
                    avgRating: { $avg: "$rating" },
                },
            },
        ]);
        const avgRating = ratingAgg.length > 0 ? ratingAgg[0].avgRating : 0;
        // 5. RESPONSE
        res.json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    avatar: user.avatar,
                    phone: user.phone,
                    address: user.address,
                    rating: avgRating,
                    totalReviews,
                    createdAt: user.createdAt,
                },
                stats: {
                    totalProducts,
                    totalReviews,
                    rating: avgRating,
                },
                products,
                reviews,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getUserProfile = getUserProfile;
