import { Request, Response } from "express";
import slugify from "slugify";
import Post from "../models/post.model";
import { AuthRequest } from "src/middleware/auth.middleware";
import mongoose from "mongoose";
import Category from "../models/category.model";

export const getProducts = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;
    const skip = (page - 1) * limit;

    const {
      keyword,
      parentCategoryId,
      categoryId,
      min,
      max,
      provinceCode,
      wardCode,
      condition,
      sortBy,
      status,
    } = req.query;

    const pipeline: any[] = [];

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
    const matchStage: any = {};
    const isAdmin = req.user?.role === "admin";

    if (isAdmin) {
      if (status) matchStage.status = status;
    } else {
      matchStage.status = "active";
    }

    if (categoryId) {
      // Nếu có categoryId cụ thể, chỉ lấy theo ID đó (Ưu tiên số 1)
      matchStage.category = new mongoose.Types.ObjectId(categoryId as string);
    } else if (parentCategoryId) {
      // Nếu chỉ có parentCategoryId, tìm tất cả category con thuộc cha này
      const subCategories = await Category.find({
        parentId: new mongoose.Types.ObjectId(parentCategoryId as string),
        isActive: true,
      }).select("_id");

      const subCategoryIds = subCategories.map((cat) => cat._id);

      // Bao gồm cả chính ID của parentCategory và các con của nó
      matchStage.category = {
        $in: [
          new mongoose.Types.ObjectId(parentCategoryId as string),
          ...subCategoryIds,
        ],
      };
    }

    if (provinceCode) matchStage["location.provinceCode"] = provinceCode;
    if (wardCode) matchStage["location.wardCode"] = wardCode;
    if (condition) matchStage["condition.label"] = condition;

    if (min || max) {
      matchStage.price = {};
      if (min) matchStage.price.$gte = Number(min);
      if (max) matchStage.price.$lte = Number(max);
    }

    pipeline.push({ $match: matchStage });

    // --- MỚI: LOOKUP SELLER (Join với bảng users) ---
    // Giả sử trong bảng Post bạn lưu ID người bán tại trường 'user' hoặc 'seller'
    pipeline.push(
      {
        $lookup: {
          from: "users", // Tên collection users trong DB
          localField: "seller", // Trường chứa ID người bán trong bảng Post
          foreignField: "_id",
          as: "sellerInfo",
        },
      },
      {
        // Chuyển mảng sellerInfo thành object (vì lookup luôn trả về mảng)
        $unwind: {
          path: "$sellerInfo",
          preserveNullAndEmptyArrays: true, // Giữ lại post nếu không tìm thấy user
        },
      },
    );

    // 3. SORT STAGE
    let sortStage: any = {};
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
    const projectFields: any = {
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

    if (isAdmin) projectFields.status = 1;
    if (keyword) projectFields.score = { $meta: "searchScore" };

    // 5. FACET STAGE
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }, { $project: projectFields }],
      },
    });

    const result = await Post.aggregate(pipeline);
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách sản phẩm",
      error: error.message,
    });
  }
};
export const getProductDetail = async (req: Request, res: Response) => {
  try {
    const identity = req.params.identity as string;

    const isObjectId = mongoose.Types.ObjectId.isValid(identity);
    const query = isObjectId ? { _id: identity } : { slug: identity };

    const product = await Post.findOne(query)
      .populate("seller", "name email avatar phone lastActive")
      .populate("category", "name slug _id parentId")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    Post.findByIdAndUpdate(product._id, { $inc: { views: 1 } }).exec();
    if (product.category) {
      const relatedProducts = await Post.find({
        category: product.category._id, // Cùng danh mục
        _id: { $ne: product._id }, // Loại trừ sản phẩm hiện tại đang xem
        status: "active", // Chỉ lấy tin đang hoạt động
      })
        .select("title slug price images location createdAt")
        .limit(6) // Lấy tối đa 6 sản phẩm
        .sort({ createdAt: -1 }) // Ưu tiên tin mới nhất
        .lean();

      // 4. Trả về cả sản phẩm chính và danh sách liên quan
      res.json({
        success: true,
        data: product,
        related: relatedProducts,
      });
    } else {
      res.json({
        success: true,
        data: product,
        related: [],
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Xác thực người dùng thất bại" });
    }

    const {
      title,
      description,
      price,
      priceNegotiable,
      images,
      parentCategoryId,
      categoryId,
      condition,
      province,
      provinceCode,
      ward,
      wardCode,
      detail,
      attributes,
    } = req.body;

    const finalCategory = categoryId || parentCategoryId;
    if (!finalCategory) {
      return res
        .status(400)
        .json({ message: "Vui lòng chọn danh mục sản phẩm" });
    }

    const slug = `${slugify(title, { lower: true, locale: "vi" })}-${Date.now()}`;
    const fullAddress = [detail, ward, province].filter(Boolean).join(", ");

    const newProduct = new Post({
      title,
      slug,
      description,
      price: Number(price),
      priceNegotiable: !!priceNegotiable,
      images,
      category: new mongoose.Types.ObjectId(finalCategory as string),
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
  } catch (error: any) {
    console.error("Create Product Error:", error);
    res.status(500).json({
      message: "Lỗi khi tạo sản phẩm",
      error: error.message,
    });
  }
};
export const getRelatedProducts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 6;

    const currentProduct = await Post.findById(id).select("category").lean();

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm gốc",
      });
    }

    const related = await Post.find({
      category: currentProduct.category,
      _id: { $ne: currentProduct._id },
      status: "active",
    })
      .select("title price images location createdAt slug")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: related,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy sản phẩm liên quan",
      error: error.message,
    });
  }
};
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Kiểm tra đăng nhập
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Xác thực người dùng thất bại" });
    }

    const { id } = req.params;
    const {
      title,
      description,
      price,
      priceNegotiable,
      images,
      parentCategoryId,
      categoryId,
      condition,
      province,
      provinceCode,
      ward,
      wardCode,
      detail,
    } = req.body;

    // 2. Tìm sản phẩm và Kiểm tra quyền sở hữu (Check Owner)
    const product = await Post.findById(id);

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
    const newSlug = `${slugify(title, { lower: true, locale: "vi" })}-${Date.now()}`;
    const fullAddress = [detail, ward, province].filter(Boolean).join(", ");

    // 4. Cập nhật dữ liệu
    const updatedProduct = await Post.findByIdAndUpdate(
      id,
      {
        title,
        slug: title !== product.title ? newSlug : product.slug, // Chỉ đổi slug nếu đổi tiêu đề
        description,
        price: Number(price),
        priceNegotiable: !!priceNegotiable,
        images,
        category: new mongoose.Types.ObjectId(finalCategory as string),
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
        },
      },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật tin đăng thành công!",
      data: updatedProduct,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật sản phẩm",
      error: error.message,
    });
  }
};
export const getMyPosts = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Kiểm tra xác thực (giống các hàm khác của bạn)
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Yêu cầu đăng nhập" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;
    const query: any = { seller: req.user._id };
    if (status) {
      query.status = status;
    }
    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title price images location status createdAt slug views") // Chỉ lấy các field cần thiết
        .lean(),
      Post.countDocuments(query),
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy bài đăng cá nhân",
      error: error.message,
    });
  }
};
// --- Duyệt tin (Approve) ---
export const approvePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
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
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi duyệt tin", error: error.message });
  }
};

// --- Ẩn tin (Hide) ---
export const hidePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const post = await Post.findById(id);
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
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi ẩn tin", error: error.message });
  }
};

// --- Từ chối duyệt tin (Reject) ---
export const rejectPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const post = await Post.findById(id);
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Lỗi từ chối duyệt tin",
      error: error.message,
    });
  }
};

// --- Xóa tin (Delete) ---
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tin" });

    await Post.findByIdAndDelete(id);

    res.json({ success: true, message: "Đã xóa tin!" });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi xóa tin", error: error.message });
  }
};
