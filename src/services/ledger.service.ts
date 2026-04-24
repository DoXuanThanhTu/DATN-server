import Ledger from "../models/ledger.model";

export const postLedger = async ({
  debitAccount,
  creditAccount,
  amount,
  orderId,
  referenceId,
  source,
  description,
}: any) => {
  return Ledger.insertMany([
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
