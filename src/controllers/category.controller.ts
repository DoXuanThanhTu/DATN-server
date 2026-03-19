import { Request, Response } from "express";
import Category from "../models/category.model";
import slugify from "slugify";

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({
        order: 1,
      })
      .select("name slug icon parentId order")
      .lean();
    const categoryTree = categories
      .filter((c) => !c.parentId)
      .map((parent) => ({
        ...parent,
        children: categories.filter(
          (c) => c.parentId?.toString() === parent._id.toString(),
        ),
      }));

    res.json({ data: categoryTree });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, icon, parentId, order } = req.body;
    const slug = slugify(name, { lower: true });

    const newCategory = await Category.create({
      name,
      slug,
      icon,
      parentId,
      order,
    });

    res.status(201).json({ data: newCategory });
  } catch (error: any) {
    if (error.code === 11000)
      return res.status(400).json({ message: "Danh mục đã tồn tại" });
    res.status(500).json({ message: error.message });
  }
};
