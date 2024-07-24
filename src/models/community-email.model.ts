import { Document, model, Model, Schema } from "mongoose";

interface ICommunityEmail {
  _id?: string;
  email: string;
}

interface CommunityEmailDocument extends Document {
  email: string;
}

const CommunityEmailSchema: Schema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true
    }
  },
  {
    timestamps: true,
    collection: "community-email"
  }
);

const CommunityEmail: Model<CommunityEmailDocument> =
  model<CommunityEmailDocument>("CommunityEmail", CommunityEmailSchema);

export { ICommunityEmail, CommunityEmailDocument, CommunityEmail };
