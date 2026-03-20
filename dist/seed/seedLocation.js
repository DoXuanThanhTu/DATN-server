"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const location_model_1 = __importDefault(require("../models/location.model"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function seedLocation() {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log("✅ Connected MongoDB");
        const filePath = path_1.default.join(__dirname, "./mongo_data_vn_unit.json");
        const raw = fs_1.default.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        const bulkData = [];
        data.forEach((province) => {
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
                province.Wards.forEach((ward) => {
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
        await location_model_1.default.deleteMany({});
        console.log("Cleared old data");
        await location_model_1.default.insertMany(bulkData, { ordered: false });
        console.log("Seed SUCCESS");
        console.log("Total records:", bulkData.length);
        process.exit(0);
    }
    catch (error) {
        console.error("Seed FAILED:", error);
        process.exit(1);
    }
}
seedLocation();
