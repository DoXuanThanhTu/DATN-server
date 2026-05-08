"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPosts = exports.getNearbyProducts = exports.deletePost = exports.rejectPost = exports.hidePost = exports.approvePost = exports.getMyPosts = exports.updateProduct = exports.getRecommendedProducts = exports.getRecommendedProductsService = exports.getRelatedProducts = exports.createProduct = exports.getProductDetail = exports.getProducts = void 0;
const slugify_1 = __importDefault(require("slugify"));
const post_model_1 = __importDefault(require("../models/post.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const category_model_1 = __importDefault(require("../models/category.model"));
const getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const skip = (page - 1) * limit;
        const { keyword, parentCategoryId, categoryId, min, max, provinceCode, wardCode, condition, sortBy, status, } = req.query;
        const pipeline = [];
        // 1. SEARCH STAGE
        if (keyword) {
            pipeline.push({
                $search: {
                    index: "search",
                    compound: {
                        should: [
                            {
                                autocomplete: {
                                    query: keyword,
                                    path: "title",
                                    score: { boost: { value: 10 } },
                                    fuzzy: { maxEdits: 1, prefixLength: 1 },
                                },
                            },
                            {
                                text: {
                                    query: keyword,
                                    path: "description",
                                    score: { boost: { value: 1 } },
                                },
                            },
                        ],
                    },
                },
            });
        }
        // 2. MATCH STAGE
        const matchStage = {};
        const isAdmin = req.user?.role === "admin";
        if (isAdmin) {
            if (status)
                matchStage.status = status;
        }
        else {
            matchStage.status = "active";
        }
        if (categoryId) {
            // Nếu có categoryId cụ thể, chỉ lấy theo ID đó (Ưu tiên số 1)
            matchStage.category = new mongoose_1.default.Types.ObjectId(categoryId);
        }
        else if (parentCategoryId) {
            // Nếu chỉ có parentCategoryId, tìm tất cả category con thuộc cha này
            const subCategories = await category_model_1.default.find({
                parentId: new mongoose_1.default.Types.ObjectId(parentCategoryId),
                isActive: true,
            }).select("_id");
            const subCategoryIds = subCategories.map((cat) => cat._id);
            // Bao gồm cả chính ID của parentCategory và các con của nó
            matchStage.category = {
                $in: [
                    new mongoose_1.default.Types.ObjectId(parentCategoryId),
                    ...subCategoryIds,
                ],
            };
        }
        if (provinceCode)
            matchStage["location.provinceCode"] = provinceCode;
        if (wardCode)
            matchStage["location.wardCode"] = wardCode;
        if (condition)
            matchStage["condition.label"] = condition;
        if (min || max) {
            matchStage.price = {};
            if (min)
                matchStage.price.$gte = Number(min);
            if (max)
                matchStage.price.$lte = Number(max);
        }
        pipeline.push({ $match: matchStage });
        // --- MỚI: LOOKUP SELLER (Join với bảng users) ---
        // Giả sử trong bảng Post bạn lưu ID người bán tại trường 'user' hoặc 'seller'
        pipeline.push({
            $lookup: {
                from: "users", // Tên collection users trong DB
                localField: "seller", // Trường chứa ID người bán trong bảng Post
                foreignField: "_id",
                as: "sellerInfo",
            },
        }, {
            // Chuyển mảng sellerInfo thành object (vì lookup luôn trả về mảng)
            $unwind: {
                path: "$sellerInfo",
                preserveNullAndEmptyArrays: true, // Giữ lại post nếu không tìm thấy user
            },
        });
        // 3. SORT STAGE
        let sortStage = {};
        switch (sortBy) {
            case "price_asc":
                sortStage = { price: 1 };
                break;
            case "price_desc":
                sortStage = { price: -1 };
                break;
            case "newest":
                sortStage = { createdAt: -1 };
                break;
            default:
                sortStage = keyword
                    ? { score: { $meta: "searchScore" }, createdAt: -1 }
                    : { createdAt: -1 };
        }
        pipeline.push({ $sort: sortStage });
        // 4. PROJECT STAGE (Cấu hình những gì muốn lấy)
        const projectFields = {
            title: 1,
            slug: 1,
            price: 1,
            images: 1,
            location: 1,
            condition: 1,
            createdAt: 1,
            description: 1,
            // Lấy các thông tin cần thiết của seller, tránh lấy password/token
            seller: {
                _id: "$sellerInfo._id",
                name: "$sellerInfo.name",
                avatar: "$sellerInfo.avatar",
            },
        };
        if (isAdmin)
            projectFields.status = 1;
        if (keyword)
            projectFields.score = { $meta: "searchScore" };
        // 5. FACET STAGE
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: limit }, { $project: projectFields }],
            },
        });
        const result = await post_model_1.default.aggregate(pipeline);
        const dataFacet = result[0];
        const totalResult = dataFacet?.metadata[0]?.total || 0;
        res.json({
            success: true,
            data: dataFacet?.data || [],
            pagination: {
                totalResult,
                totalPage: Math.ceil(totalResult / limit),
                currentPage: page,
                limit,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi lấy danh sách sản phẩm",
            error: error.message,
        });
    }
};
exports.getProducts = getProducts;
const getProductDetail = async (req, res) => {
    try {
        const identity = req.params.identity;
        const isObjectId = mongoose_1.default.Types.ObjectId.isValid(identity);
        const query = isObjectId ? { _id: identity } : { slug: identity };
        const product = await post_model_1.default.findOne(query)
            .populate("seller", "name email avatar phone lastActive")
            .populate("category", "name slug _id parentId")
            .lean();
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        post_model_1.default.findByIdAndUpdate(product._id, { $inc: { views: 1 } }).exec();
        if (product.category) {
            const relatedProducts = await post_model_1.default.find({
                category: product.category._id, // Cùng danh mục
                _id: { $ne: product._id }, // Loại trừ sản phẩm hiện tại đang xem
                status: "active", // Chỉ lấy tin đang hoạt động
            })
                .select("title slug price images location createdAt")
                .limit(6) // Lấy tối đa 6 sản phẩm
                .sort({ createdAt: -1 }) // Ưu tiên tin mới nhất
                .lean();
            // if (relatedProducts.length === 0) {
            //   let limit = 6;
            //   let match: any = {
            //     status: "active",
            //     _id: { $ne: product._id },
            //   };
            //   // if (productId) {
            //   //   match._id = { $ne: productId };
            //   // }
            //   const products = await Post.aggregate([
            //     { $match: match },
            //     { $sample: { size: limit * 2 } },
            //     {
            //       $addFields: {
            //         score: {
            //           $add: [
            //             { $multiply: ["$views", 0.3] },
            //             {
            //               $multiply: [
            //                 {
            //                   $divide: [
            //                     { $subtract: [new Date(), "$createdAt"] },
            //                     1000 * 60 * 60 * 24,
            //                   ],
            //                 },
            //                 -1,
            //               ],
            //             },
            //           ],
            //         },
            //       },
            //     },
            //     { $sort: { score: -1 } },
            //     { $limit: limit },
            //     {
            //       $project: {
            //         title: 1,
            //         price: 1,
            //         images: 1,
            //         location: 1,
            //         createdAt: 1,
            //         slug: 1,
            //       },
            //     },
            //   ]);
            //   relatedProducts.push(...products);
            // }
            // 4. Trả về cả sản phẩm chính và danh sách liên quan
            res.json({
                success: true,
                data: product,
                related: relatedProducts,
            });
        }
        else {
            res.json({
                success: true,
                data: product,
                related: [],
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi server", error });
    }
};
exports.getProductDetail = getProductDetail;
const createProduct = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Xác thực người dùng thất bại" });
        }
        const { title, description, price, priceNegotiable, images, parentCategoryId, categoryId, condition, province, provinceCode, ward, wardCode, detail, lat, lng, attributes, } = req.body;
        const finalCategory = categoryId || parentCategoryId;
        if (!finalCategory) {
            return res
                .status(400)
                .json({ message: "Vui lòng chọn danh mục sản phẩm" });
        }
        const slug = `${(0, slugify_1.default)(title, { lower: true, locale: "vi" })}-${Date.now()}`;
        const fullAddress = [detail, ward, province].filter(Boolean).join(", ");
        const newProduct = new post_model_1.default({
            title,
            slug,
            description,
            price: Number(price),
            priceNegotiable: !!priceNegotiable,
            images,
            category: new mongoose_1.default.Types.ObjectId(finalCategory),
            seller: req.user._id,
            condition: {
                label: condition?.label || "good",
                percentage: Number(condition?.percentage) || 100,
                isFullbox: !!condition?.isFullbox,
                warranty: condition?.warranty || "Không bảo hành",
            },
            location: {
                provinceCode,
                provinceName: province,
                wardCode,
                wardName: ward,
                detail,
                fullAddress,
                lat,
                lng,
            },
            geo: {
                type: "Point",
                coordinates: [lng, lat],
            },
            attributes: attributes || {},
            status: "pending",
        });
        // 4. Lưu vào Database
        await newProduct.save();
        res.status(201).json({
            message: "Đăng tin thành công!",
            data: newProduct,
        });
    }
    catch (error) {
        console.error("Create Product Error:", error);
        res.status(500).json({
            message: "Lỗi khi tạo sản phẩm",
            error: error.message,
        });
    }
};
exports.createProduct = createProduct;
const getRelatedProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 6;
        const currentProduct = await post_model_1.default.findById(id).select("category").lean();
        if (!currentProduct) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm gốc",
            });
        }
        console.log("currentProduct", currentProduct);
        const related = await post_model_1.default.find({
            category: currentProduct.category,
            _id: { $ne: currentProduct._id },
            status: "active",
        })
            .select("title price images location createdAt slug")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        console.log("related", related, related?.length);
        if (!related || related.length === 0) {
            let match = {
                status: "active",
            };
            // if (user?.address?.provinceCode) {
            //   match["location.provinceCode"] = user.address.provinceCode;
            // }
            const products = await post_model_1.default.find(match)
                .sort({ createdAt: -1 })
                .limit(limit)
                .select("title price images location createdAt slug")
                .lean();
            return res.json({
                success: true,
                data: products,
            });
        }
        res.json({
            success: true,
            data: related,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi lấy sản phẩm liên quan",
            error: error.message,
        });
    }
};
exports.getRelatedProducts = getRelatedProducts;
const getRecommendedProductsService = async (user, limit = 6, productId) => {
    let match = {
        status: "active",
        _id: { $ne: productId },
    };
    // if (productId) {
    //   match._id = { $ne: productId };
    // }
    const products = await post_model_1.default.aggregate([
        { $match: match },
        { $sample: { size: limit * 2 } },
        {
            $addFields: {
                score: {
                    $add: [
                        { $multiply: ["$views", 0.3] },
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        { $subtract: [new Date(), "$createdAt"] },
                                        1000 * 60 * 60 * 24,
                                    ],
                                },
                                -1,
                            ],
                        },
                    ],
                },
            },
        },
        { $sort: { score: -1 } },
        { $limit: limit },
        {
            $project: {
                title: 1,
                price: 1,
                images: 1,
                location: 1,
                createdAt: 1,
                slug: 1,
            },
        },
    ]);
    return products;
};
exports.getRecommendedProductsService = getRecommendedProductsService;
const getRecommendedProducts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12;
        const user = req.user;
        let match = {
            status: "active",
        };
        // if (user?.address?.provinceCode) {
        //   match["location.provinceCode"] = user.address.provinceCode;
        // }
        const products = await post_model_1.default.aggregate([
            { $match: match },
            { $sample: { size: limit * 2 } },
            {
                $addFields: {
                    score: {
                        $add: [
                            { $multiply: ["$views", 0.3] },
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            { $subtract: [new Date(), "$createdAt"] },
                                            1000 * 60 * 60 * 24,
                                        ],
                                    },
                                    -1,
                                ],
                            },
                        ],
                    },
                },
            },
            { $sort: { score: -1 } },
            { $limit: limit },
            {
                $project: {
                    title: 1,
                    price: 1,
                    images: 1,
                    location: 1,
                    createdAt: 1,
                    slug: 1,
                },
            },
        ]);
        res.json({
            success: true,
            data: products,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi lấy sản phẩm đề xuất",
            error: error.message,
        });
    }
};
exports.getRecommendedProducts = getRecommendedProducts;
const updateProduct = async (req, res) => {
    try {
        // 1. Kiểm tra đăng nhập
        if (!req.user) {
            return res
                .status(401)
                .json({ success: false, message: "Xác thực người dùng thất bại" });
        }
        const { id } = req.params;
        const { title, description, price, priceNegotiable, images, parentCategoryId, categoryId, condition, province, provinceCode, ward, wardCode, detail, lat, lng, } = req.body;
        // 2. Tìm sản phẩm và Kiểm tra quyền sở hữu (Check Owner)
        const product = await post_model_1.default.findById(id);
        if (!product) {
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy sản phẩm" });
        }
        // So sánh ID người bán trong DB với ID người dùng đang gửi request
        if (product.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền chỉnh sửa bài đăng này",
            });
        }
        // 3. Xử lý logic dữ liệu tương tự lúc Create
        const finalCategory = categoryId || parentCategoryId;
        if (!finalCategory) {
            return res
                .status(400)
                .json({ success: false, message: "Vui lòng chọn danh mục sản phẩm" });
        }
        // Tạo slug mới nếu tiêu đề thay đổi (tùy chọn, hoặc giữ nguyên slug cũ)
        const newSlug = `${(0, slugify_1.default)(title, { lower: true, locale: "vi" })}-${Date.now()}`;
        const fullAddress = [detail, ward, province].filter(Boolean).join(", ");
        // 4. Cập nhật dữ liệu
        const updatedProduct = await post_model_1.default.findByIdAndUpdate(id, {
            title,
            slug: title !== product.title ? newSlug : product.slug, // Chỉ đổi slug nếu đổi tiêu đề
            description,
            price: Number(price),
            priceNegotiable: !!priceNegotiable,
            images,
            category: new mongoose_1.default.Types.ObjectId(finalCategory),
            condition: {
                label: condition?.label || "good",
                percentage: Number(condition?.percentage) || 100,
                isFullbox: !!condition?.isFullbox,
                warranty: condition?.warranty || "Không bảo hành",
            },
            location: {
                provinceCode,
                provinceName: province,
                wardCode,
                wardName: ward,
                detail,
                fullAddress,
                lat,
                lng,
            },
            geo: {
                type: "Point",
                coordinates: [lng, lat],
            },
        }, { new: true, runValidators: true });
        res.status(200).json({
            success: true,
            message: "Cập nhật tin đăng thành công!",
            data: updatedProduct,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật sản phẩm",
            error: error.message,
        });
    }
};
exports.updateProduct = updateProduct;
const getMyPosts = async (req, res) => {
    try {
        // 1. Kiểm tra xác thực (giống các hàm khác của bạn)
        if (!req.user) {
            return res
                .status(401)
                .json({ success: false, message: "Yêu cầu đăng nhập" });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const skip = (page - 1) * limit;
        const query = { seller: req.user._id };
        if (status) {
            query.status = status;
        }
        const [posts, total] = await Promise.all([
            post_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("title price images location status createdAt slug views") // Chỉ lấy các field cần thiết
                .lean(),
            post_model_1.default.countDocuments(query),
        ]);
        // 4. Trả về kết quả
        res.json({
            success: true,
            data: posts,
            pagination: {
                totalResult: total,
                totalPage: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi lấy bài đăng cá nhân",
            error: error.message,
        });
    }
};
exports.getMyPosts = getMyPosts;
// --- Duyệt tin (Approve) ---
const approvePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await post_model_1.default.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy tin" });
        // if (post.status !== "pending") {
        //   return res
        //     .status(400)
        //     .json({ success: false, message: "Tin không ở trạng thái chờ duyệt" });
        // }
        post.status = "active";
        await post.save();
        res.json({ success: true, message: "Đã duyệt tin!", data: post });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Lỗi duyệt tin", error: error.message });
    }
};
exports.approvePost = approvePost;
// --- Ẩn tin (Hide) ---
const hidePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const post = await post_model_1.default.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy tin" });
        if (post.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "Chỉ có tin đang hiển thị mới có thể ẩn",
            });
        }
        post.status = "hidden";
        // post.hiddenReason = reason || "";
        await post.save();
        res.json({ success: true, message: "Đã ẩn tin!", data: post });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Lỗi ẩn tin", error: error.message });
    }
};
exports.hidePost = hidePost;
// --- Từ chối duyệt tin (Reject) ---
const rejectPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const post = await post_model_1.default.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy tin" });
        if (post.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Chỉ có tin chờ duyệt mới có thể từ chối",
            });
        }
        post.status = "rejected";
        // post.rejectReason = reason || "";
        await post.save();
        res.json({ success: true, message: "Đã từ chối duyệt tin!", data: post });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi từ chối duyệt tin",
            error: error.message,
        });
    }
};
exports.rejectPost = rejectPost;
// --- Xóa tin (Delete) ---
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await post_model_1.default.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, message: "Không tìm thấy tin" });
        await post_model_1.default.findByIdAndDelete(id);
        res.json({ success: true, message: "Đã xóa tin!" });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Lỗi xóa tin", error: error.message });
    }
};
exports.deletePost = deletePost;
const getNearbyProducts = async (req, res) => {
    try {
        const { lat, lng, distance = 10, limit = 10, page = 1 } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp tọa độ (lat, lng) để tìm kiếm quanh đây.",
            });
        }
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const pipeline = [
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)],
                    },
                    distanceField: "distance",
                    maxDistance: parseFloat(distance) * 1000,
                    spherical: true,
                    query: { status: "active" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "seller",
                    foreignField: "_id",
                    as: "sellerInfo",
                },
            },
            {
                $unwind: {
                    path: "$sellerInfo",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $skip: skip },
                        { $limit: limitNum },
                        {
                            $project: {
                                title: 1,
                                slug: 1,
                                price: 1,
                                images: 1,
                                location: 1,
                                distance: 1,
                                createdAt: 1,
                                seller: {
                                    _id: "$sellerInfo._id",
                                    name: "$sellerInfo.name",
                                    avatar: "$sellerInfo.avatar",
                                },
                            },
                        },
                    ],
                },
            },
        ];
        const result = await post_model_1.default.aggregate(pipeline);
        const dataFacet = result[0];
        const totalResult = dataFacet?.metadata[0]?.total || 0;
        const formattedData = dataFacet?.data.map((item) => ({
            ...item,
            distanceKm: parseFloat((item.distance / 1000).toFixed(1)),
        }));
        res.status(200).json({
            success: true,
            data: formattedData || [],
            pagination: {
                totalResult,
                totalPage: Math.ceil(totalResult / limitNum),
                currentPage: pageNum,
                limit: limitNum,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi tìm kiếm sản phẩm quanh đây",
            error: error.message,
        });
    }
};
exports.getNearbyProducts = getNearbyProducts;
const getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const skip = (page - 1) * limit;
        const { keyword, parentCategoryId, categoryId, min, max, provinceCode, wardCode, condition, sortBy, status, } = req.query;
        const pipeline = [];
        //Search
        if (keyword) {
            pipeline.push({
                $search: {
                    index: "search",
                    compound: {
                        should: [
                            {
                                autocomplete: {
                                    query: keyword,
                                    path: "title",
                                    score: { boost: { value: 10 } },
                                    fuzzy: {
                                        maxEdits: 1,
                                    },
                                },
                            },
                            {
                                text: {
                                    query: keyword,
                                    path: "description",
                                    score: { boost: { value: 5 } },
                                },
                            },
                        ],
                    },
                },
            });
        }
        //Match
        const matchStage = {};
        const isAdmin = req.user?.role === "admin";
        if (isAdmin) {
            if (status) {
                matchStage.status = status;
            }
        }
        else {
            matchStage.status = "active";
        }
        if (categoryId) {
            matchStage.category = categoryId;
        }
        else if (parentCategoryId) {
            const subCategories = await category_model_1.default.find({ parentId: parentCategoryId });
            const subCategoryIds = subCategories.map((cat) => cat._id);
            matchStage.category = { $in: subCategoryIds };
        }
        pipeline.push({ $match: matchStage });
        //Lookup users
        pipeline.push({
            $lookup: {
                from: "users",
                localField: "seller",
                foreignField: "_id",
                as: "sellerInfo",
            },
        }, {
            $unwind: {
                path: "$sellerInfo",
                preserveNullAndEmptyArrays: true,
            },
        }, {
            $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "categoryInfo",
            },
        }, {
            $unwind: {
                path: "$categoryInfo",
                preserveNullAndEmptyArrays: true,
            },
        });
        const projectFields = {
            title: 1,
            category: {
                _id: "$categoryInfo._id",
                name: "$categoryInfo.name",
                parentId: "$categoryInfo.parentId",
            },
            // slug: 1,
            // price: 1,
            // images: 1,
            // location: 1,
            // condition: 1,
            // createdAt: 1,
            // description: 1,
            seller: {
                _id: "$sellerInfo._id",
                name: "$sellerInfo.name",
                avatar: "$sellerInfo.avatar",
            },
        };
        //Sort
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: limit }, { $project: projectFields }],
            },
        });
        const result = await post_model_1.default.aggregate(pipeline);
        const totalResult = result[0]?.metadata[0]?.total || 0;
        const data = result[0]?.data || [];
        res.status(200).json({
            success: true,
            data: data,
            pagination: {
                totalResult,
                totalPage: Math.ceil(totalResult / limit),
                currentPage: page,
                limit,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi lấy thông tin sản phẩm",
            error: error.message,
        });
    }
};
exports.getPosts = getPosts;
