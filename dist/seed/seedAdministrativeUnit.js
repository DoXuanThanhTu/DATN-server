"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const administrativeUnit_model_1 = __importDefault(require("../models/administrativeUnit.model"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const data = [
    {
        Id: 1,
        FullName: "Thành phố trực thuộc trung ương",
        FullNameEn: "Municipality",
        ShortName: "Thành phố",
        ShortNameEn: "City",
        CodeName: "thanh_pho_truc_thuoc_trung_uong",
        CodeNameEn: "municipality",
    },
    {
        Id: 2,
        FullName: "Tỉnh",
        FullNameEn: "Province",
        ShortName: "Tỉnh",
        ShortNameEn: "Province",
        CodeName: "tinh",
        CodeNameEn: "province",
    },
    {
        Id: 3,
        FullName: "Phường",
        FullNameEn: "Ward",
        ShortName: "Phường",
        ShortNameEn: "Ward",
        CodeName: "phuong",
        CodeNameEn: "ward",
    },
    {
        Id: 4,
        FullName: "Xã",
        FullNameEn: "Commune",
        ShortName: "Xã",
        ShortNameEn: "Commune",
        CodeName: "xa",
        CodeNameEn: "commune",
    },
    {
        Id: 5,
        FullName: "Đặc khu tại hải đảo",
        FullNameEn: "Special administrative region",
        ShortName: "Đặc khu",
        ShortNameEn: "Special administrative region",
        CodeName: "dac_khu",
        CodeNameEn: "special_administrative_region",
    },
];
async function seed() {
    await mongoose_1.default.connect(process.env.MONGO_URI);
    await administrativeUnit_model_1.default.deleteMany({});
    await administrativeUnit_model_1.default.insertMany(data.map((i) => ({
        id: i.Id,
        fullName: i.FullName,
        fullNameEn: i.FullNameEn,
        shortName: i.ShortName,
        shortNameEn: i.ShortNameEn,
        codeName: i.CodeName,
        codeNameEn: i.CodeNameEn,
    })));
    console.log(" Seed AdministrativeUnit DONE");
    process.exit();
}
seed();
