// models/Vendor.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

interface IBranch {
    active: boolean;
    maps?: string;
    name?: string;
    numbers: string[];
}

interface ISpotItem {
    image: string;
    productID: string;
}

export interface IVendor extends Document {
    _id: string;
    branches?: Map<string, string>;
    branchesNew?: Map<string, IBranch>;
    bundle?: number;
    chosenShopStyle?: string;
    colorPalette?: any;
    docID?: string;
    goldCarats?: Map<string, number>;
    id?: string;
    joinDate?: Date;
    library?: any;
    locations?: any[];
    logo?: string;
    name?: string;
    products: string[];
    ratings?: any;
    reviews: number;
    segment?: string;
    silverCarats?: Map<string, number>;
    spots?: Map<string, ISpotItem[]>;
    status: string;
    views?: any;
    createdAt: Date;
    updatedAt: Date;
    rent?: number;
    commission?: number;
    activationDate?: Date;
    email?: string;
}

interface IVendorModel extends Model<IVendor> { }

const BranchSchema = new Schema<IBranch>(
    {
        active: {
            type: Boolean,
            default: true
        },
        maps: String,
        name: String,
        numbers: [String]
    },
    { _id: false }
);

const VendorSchema = new Schema<IVendor>(
    {
        _id: {
            type: String,
            required: true,
            auto: false
        },
        branches: {
            type: Map,
            of: String
        },
        branchesNew: {
            type: Map,
            of: BranchSchema
        },
        bundle: Number,
        chosenShopStyle: String,
        colorPalette: Schema.Types.Mixed,
        docID: String,
        goldCarats: {
            type: Map,
            of: Number
        },
        id: String,
        joinDate: Date,
        library: Schema.Types.Mixed,
        locations: [Schema.Types.Mixed],
        logo: String,
        name: String,
        products: [String],
        ratings: Schema.Types.Mixed,
        reviews: {
            type: Number,
            default: 0
        },
        segment: String,
        silverCarats: {
            type: Map,
            of: Number
        },
        spots: {
            type: Map,
            of: [
                {
                    image: String,
                    productID: String
                }
            ]
        },
        status: {
            type: String,
            default: 'pending'
        },
        views: Schema.Types.Mixed,
        rent: {
            type: Number,
            default: 0
        },
        commission: {
            type: Number,
            default: 0
        },
        activationDate: Date,
        email: String
    },
    {
        timestamps: true,
        _id: false
    }
);

VendorSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Vendor = (mongoose.models.Vendor as IVendorModel) ||
    mongoose.model<IVendor>('Vendor', VendorSchema);

export default Vendor;