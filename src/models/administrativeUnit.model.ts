import mongoose, { Schema } from "mongoose";

const administrativeUnitSchema = new Schema({
  id: { type: Number, required: true, unique: true },

  fullName: String,
  fullNameEn: String,

  shortName: String,
  shortNameEn: String,

  codeName: String,
  codeNameEn: String,
});

export default mongoose.model("AdministrativeUnit", administrativeUnitSchema);
