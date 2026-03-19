import mongoose from "mongoose";
import Category from "../models/category.model";
import slugify from "slugify";
import dotenv from "dotenv";
dotenv.config();
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
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("Connected to MongoDB...");

    await Category.deleteMany({});
    console.log("Cleared old categories.");

    for (const item of categoriesData) {
      const parent = await Category.create({
        name: item.name,
        slug: slugify(item.name, { lower: true }),
        icon: item.icon,
        order: item.order,
        parentId: null,
      });

      console.log(`Added Parent: ${parent.name}`);

      if (item.children && item.children.length > 0) {
        const childPromises = item.children.map((childName, index) => {
          return Category.create({
            name: childName,
            slug: slugify(childName, { lower: true }),
            parentId: parent._id,
            order: index + 1,
          });
        });
        await Promise.all(childPromises);
        console.log(
          `   --> Added ${item.children.length} children for ${parent.name}`,
        );
      }
    }

    console.log("Seed data successfully!");
    process.exit();
  } catch (error) {
    console.error("Error seeding categories:", error);
    process.exit(1);
  }
};

seedCategories();
