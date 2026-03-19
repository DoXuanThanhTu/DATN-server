import mongoose from "mongoose";

import User from "../models/user.model";
import Product from "../models/post.model";
import dotenv from "dotenv";
dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI!);

  await User.deleteMany();
  await Product.deleteMany();

  const user = await User.create({
    email: "test@gmail.com",
    password: "123456",
  });

  await Product.create([
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
