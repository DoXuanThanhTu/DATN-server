"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocationsGroupedByProvince = void 0;
const location_model_1 = __importDefault(require("../models/location.model"));
const getLocationsGroupedByProvince = async (req, res) => {
    try {
        const data = await location_model_1.default.aggregate([
            { $match: { type: "province" } },
            {
                $lookup: {
                    from: "locations",
                    let: { provinceCode: "$code" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$parentCode", "$$provinceCode"] },
                                type: "ward",
                            },
                        },
                        {
                            $sort: {
                                administrativeUnitId: 1,
                                name: 1,
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                Code: "$code",
                                Name: "$name",
                                FullName: {
                                    $concat: [
                                        {
                                            $switch: {
                                                branches: [
                                                    {
                                                        case: { $eq: ["$administrativeUnitId", 3] },
                                                        then: "Phường ",
                                                    },
                                                    {
                                                        case: { $eq: ["$administrativeUnitId", 4] },
                                                        then: "Xã ",
                                                    },
                                                ],
                                                default: "",
                                            },
                                        },
                                        "$name",
                                    ],
                                },
                                AdministrativeUnitId: "$administrativeUnitId",
                            },
                        },
                    ],
                    as: "Wards",
                },
            },
            {
                $project: {
                    _id: 0,
                    Type: "$type",
                    Code: "$code",
                    Name: "$name",
                    FullName: "$fullName",
                    AdministrativeUnitId: "$administrativeUnitId",
                    Wards: 1,
                },
            },
            { $sort: { Name: 1 } },
        ]);
        return res.status(200).json(data);
    }
    catch (error) {
        console.error("Lỗi lấy địa chỉ:", error);
        return res.status(500).json({ message: "Lỗi Server", error });
    }
};
exports.getLocationsGroupedByProvince = getLocationsGroupedByProvince;
