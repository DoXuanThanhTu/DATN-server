"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postLedger = void 0;
const ledger_model_1 = __importDefault(require("../models/ledger.model"));
const postLedger = async ({ debitAccount, creditAccount, amount, orderId, referenceId, source, description, }) => {
    return ledger_model_1.default.insertMany([
        {
            accountId: debitAccount,
            type: "DEBIT",
            amount,
            orderId,
            referenceId: referenceId + "_D",
            source,
            description,
        },
        {
            accountId: creditAccount,
            type: "CREDIT",
            amount,
            orderId,
            referenceId: referenceId + "_C",
            source,
            description,
        },
    ]);
};
exports.postLedger = postLedger;
