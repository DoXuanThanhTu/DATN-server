import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";
import Review from "../models/review.model";
import Post from "../models/post.model";
import UserInteraction from "../models/userInteraction.model";
const interactionScoreMap: Record<string, number> = {
  view: 1,
  like: 2,
  save: 3,
  chat: 4,
  purchase: 5,
  search: 1,
};
// Lấy thông tin cá nhân của người dùng hiện tại
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật thông tin hồ sơ
export const updateProfile = async (req: AuthRequest, res: Response) => {
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

    const updatedUser = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          name,
          phone,
          gender,
          address: addressUpdate,
          avatar,
          lastActive: new Date(),
        },
      },
      {
        returnDocument: "after", // Trả về data sau khi update
        runValidators: true, // Chạy validation của schema
      },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.status(200).json({
      message: "Cập nhật hồ sơ thành công",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      message: "Lỗi cập nhật hồ sơ",
      error: error.message,
    });
  }
};


export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const loggedInUserId = req.user?._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách người dùng" });
  }
};
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // 1. USER INFO
    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. PRODUCTS (chỉ lấy active + sold giống Shopee)
    const products = await Post.find({
      seller: userId,
      status: { $in: ["active", "sold"] },
    })
      .select("title price images status createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    const totalProducts = await Post.countDocuments({
      seller: userId,
    });

    // 3. REVIEWS (người khác đánh giá user này)
    const reviews = await Review.find({
      reviewee: userId,
    })
      .populate("reviewer", "name avatar")
      .sort({ createdAt: -1 })
      .limit(10);

    const totalReviews = await Review.countDocuments({
      reviewee: userId,
    });

    // 4. RATING AVG
    const ratingAgg = await Review.aggregate([
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const trackUserInteraction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as any)?._id;
    if (!userId) {
      return res
        .status(200)
        .json({ success: true, message: "User not authenticated" });
    }

    const { post, keyword, type } = req.body;
    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "Type is required" });
    }

    const WINDOW_MS = 1000 * 60 * 30;
    const thirtyMinutesAgo = new Date(Date.now() - WINDOW_MS);

    const filter: any = { user: userId, type };
    const insertData: any = {
      user: userId,
      type,
      score: interactionScoreMap[type] || 1,
    };

    if (type === "search") {
      const normalized = keyword?.toLowerCase().trim();
      if (!normalized)
        return res
          .status(400)
          .json({ success: false, message: "Keyword is required" });
      filter.normalizedKeyword = normalized;
      insertData.keyword = keyword;
      insertData.normalizedKeyword = normalized;
    } else {
      if (!post)
        return res
          .status(400)
          .json({ success: false, message: "Post is required" });
      filter.post = post;
      insertData.post = post;
    }

    filter.createdAt = { $gte: thirtyMinutesAgo };

    const result = await UserInteraction.findOneAndUpdate(
      filter,
      { $setOnInsert: insertData },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        includeResultMetadata: true,
      },
    );

    const isUpdatedExisting = result.lastErrorObject?.updatedExisting;

    return res.json({
      success: true,
      isNew: !isUpdatedExisting,
      action: isUpdatedExisting ? "ALREADY_EXISTS" : "CREATED_NEW",
      message: isUpdatedExisting
        ? `Tương tác ${type} đã tồn tại trong 30p qua.`
        : `Đã tạo tương tác ${type} mới.`,
      data: result.value,
    });
  } catch (error: any) {
    console.error("TRACK_ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const getAllUsersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const {
      keyword,
      role,
      status,
      sortBy,
    } = req.query;

    const pipeline: any[] = [];

    // SEARCH



    // FILTER
    const matchStage: any = {};

    if (role) {
      matchStage.role = role;
    }

    if (status) {
      matchStage.status = status;
    }
    if (keyword) {
      matchStage.name = {
        $regex: keyword,
        $options: "i",
      };
    }
    pipeline.push({
      $match: matchStage,
    });

    // SORT
    let sortStage: any = {};

    switch (sortBy) {
      case "oldest":
        sortStage = {
          createdAt: 1,
        };
        break;

      case "name_asc":
        sortStage = {
          name: 1,
        };
        break;

      case "name_desc":
        sortStage = {
          name: -1,
        };
        break;

      default:
        sortStage = keyword
          ? {
              score: {
                $meta: "searchScore",
              },
              createdAt: -1,
            }
          : {
              createdAt: -1,
            };
    }

    pipeline.push({
      $sort: sortStage,
    });

    // PROJECT
    const projectFields: any = {
      _id: 1,
      name: 1,
      email: 1,
      avatar: 1,
      role: 1,
      status: 1,
      rating: 1,
      createdAt: 1,
    };

    if (keyword) {
      projectFields.score = {
        $meta: "searchScore",
      };
    }

    // FACET
    pipeline.push({
      $facet: {
        metadata: [
          {
            $count: "total",
          },
        ],
        data: [
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
          {
            $project: projectFields,
          },
        ],
      },
    });

    const result = await User.aggregate(pipeline);

    const totalResult =
      result[0]?.metadata[0]?.total || 0;

    return res.json({
      success: true,
      data: result[0]?.data || [],
      pagination: {
        totalResult,
        totalPage: Math.ceil(
          totalResult / limit
        ),
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        "Lỗi lấy danh sách người dùng",
      error: error.message,
    });
  }
};
export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền admin",
      });
    }
    const userId = req.params.id;
    const action = req.body.action;
    const user = await User.findByIdAndUpdate(userId, {
      status: action === "block" ? "blocked" : "active",
    }, { returnDocument: "after" });
    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái người dùng thành công",
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Lỗi cập nhật trạng thái người dùng",
      error: error.message,
    });
  }
};
export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user!._id, {
      lastActive: new Date(),
    });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
};