import { Request, Response } from "express";
import slugify from "slugify";
import Post from "../models/post.model";
import { AuthRequest } from "src/middleware/auth.middleware";
import mongoose from "mongoose";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { keyword, category, min, max, provinceCode, wardCode, condition } =
      req.query;

    const filter: any = { status: "active" };

    if (keyword) {
      filter.$text = { $search: keyword as string };
    }

    if (category) {
      filter.category = category;
    }

    if (min || max) {
      filter.price = {
        ...(min && { $gte: Number(min) }),
        ...(max && { $lte: Number(max) }),
      };
    }

    if (provinceCode) {
      filter["location.provinceCode"] = provinceCode;
    }
    if (wardCode) {
      filter["location.wardCode"] = wardCode;
    }

    if (condition) {
      filter.condition = condition;
    }

    const skip = (page - 1) * limit;

    const [products, totalResult] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

      Post.countDocuments(filter),
    ]);

    const totalPage = Math.ceil(totalResult / limit);

    res.json({
      data: products,
      totalResult,
      totalPage,
      currentPage: page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

export const getProductDetail = async (req: Request, res: Response) => {
  try {
    const identity = req.params.identity as string;

    const isObjectId = mongoose.Types.ObjectId.isValid(identity);
    const query = isObjectId ? { _id: identity } : { slug: identity };

    const product = await Post.findOne(query)
      .populate("seller", "name email avatar phone lastActive")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    Post.findByIdAndUpdate(product._id, { $inc: { views: 1 } }).exec();

    res.json({ data: product });
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
      category,
      condition,
      province,
      provinceCode,
      ward,
      wardCode,
      detail,
    } = req.body;

    const slug = `${slugify(title, { lower: true, locale: "vi" })}-${Date.now()}`;

    const fullAddress = [detail, ward, province].filter(Boolean).join(", ");

    const newProduct = new Post({
      title,
      slug,
      description,
      price: Number(price),
      priceNegotiable: !!priceNegotiable,
      images,
      category,
      seller: req.user._id,
      condition: condition?.includes("Mới") ? "new" : "used",
      location: {
        provinceCode,
        provinceName: province,
        wardCode,
        wardName: ward,
        detail,
        fullAddress,
      },
      status: "active",
    });

    await newProduct.save();

    res.status(201).json({
      message: "Đăng tin thành công!",
      data: newProduct,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Lỗi khi tạo sản phẩm", error: error.message });
  }
};
