import { ObjectId } from "mongodb";
import { Document, model, Model, Schema } from "mongoose";

interface IProperty {
  _id?: string;
  ownerId: string;
  name: string;
  type: string;
  location: string;
  price: number;
  description: string;
  images: string[];
  checkin: Date | null;
  checkout: Date | null;
  additional: string;
  views: number;
  clicks: number;
  openingStatus?: string;
  openingAdditional?: string;
}

interface PropertyDocument extends Document {
  ownerId: string;
  name: string;
  type: string;
  location: string;
  price: number;
  description: string;
  images: string[];
  checkin: Date | null;
  checkout: Date | null;
  additional: string;
  views: number;
  clicks: number;
  openingStatus?: string;
  openingAdditional?: string;
}

const PropertySchema: Schema = new Schema(
  {
    ownerId: {
      type: ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    images: {
      type: [String]
    },
    checkin: {
      type: Date,
      required: false
    },
    checkout: {
      type: Date,
      required: false
    },
    additional: {
      type: String,
      required: false
    },
    views: {
      type: Number,
      required: true,
      default: 0
    },
    clicks: {
      type: Number,
      required: true,
      default: 0
    },
    openingStatus: {
      type: String,
      required: false
    },
    openingAdditional: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true,
    collection: "property"
  }
);

const Property: Model<PropertyDocument> = model<PropertyDocument>(
  "Property",
  PropertySchema
);

export { IProperty, PropertyDocument, Property };
