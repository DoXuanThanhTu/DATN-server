import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import Location from "../models/location.model";

import dotenv from "dotenv";
dotenv.config();
async function seedLocation() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("✅ Connected MongoDB");

    const filePath = path.join(__dirname, "./mongo_data_vn_unit.json");

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    const bulkData: any[] = [];

    data.forEach((province: any) => {
      bulkData.push({
        code: province.Code,
        name: province.Name,
        nameEn: province.NameEn,
        fullName: province.FullName,
        fullNameEn: province.FullNameEn,
        codeName: province.CodeName,

        type: "province",
        administrativeUnitId: province.AdministrativeUnitId,

        parentCode: null,
      });
      if (province.Wards && Array.isArray(province.Wards)) {
        province.Wards.forEach((ward: any) => {
          bulkData.push({
            code: ward.Code,
            name: ward.Name,
            nameEn: ward.NameEn,
            fullName: ward.FullName,
            fullNameEn: ward.FullNameEn,
            codeName: ward.CodeName,

            type: "ward",
            administrativeUnitId: ward.AdministrativeUnitId,

            parentCode: province.Code,
          });
        });
      }
    });

    await Location.deleteMany({});
    console.log("Cleared old data");

    await Location.insertMany(bulkData, { ordered: false });

    console.log("Seed SUCCESS");
    console.log("Total records:", bulkData.length);

    process.exit(0);
  } catch (error) {
    console.error("Seed FAILED:", error);
    process.exit(1);
  }
}

seedLocation();
