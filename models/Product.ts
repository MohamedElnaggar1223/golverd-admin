import mongoose, { Document, Model, Schema } from 'mongoose';

interface IBranch {
    inStock: number;
    lastStocked?: Date;
    revenue: number;
    sold: number;
}

export interface IProduct {
    _id: string;
    basePrice?: number;
    branches: Map<string, IBranch>;
    brandDocID?: string;
    brandID?: string;
    carats?: any;
    category?: string;
    clarity?: any;
    collection?: string;
    color?: string;
    customizable: boolean;
    description?: string;
    diamondQuantity?: any;
    diamondShapes?: any;
    docID?: string;
    exactDate?: Date;
    frontProduct: boolean;
    gender?: string;
    goldColor?: any;
    goldKarat?: string;
    goldWeight?: any;
    hashtags: string[];
    images: string[];
    library: any[];
    metal?: string;
    minStock: number;
    name?: string;
    plating?: string;
    price?: number;
    pricingMethod?: string;
    promoted: boolean;
    rawTypes?: string;
    reviews: number;
    segment?: number;
    serialID?: string;
    silverKarat?: string;
    weight?: number;
    createdAt: Date;
    updatedAt: Date;
}

interface IProductModel extends Model<IProduct> { }

const BranchSchema = new Schema<IBranch>(
    {
        inStock: {
            type: Number,
            default: 0
        },
        lastStocked: Date,
        revenue: {
            type: Number,
            default: 0
        },
        sold: {
            type: Number,
            default: 0
        }
    },
    { _id: false }
);

const ProductSchema = new Schema<IProduct>(
    {
        _id: {
            type: String,
            required: true
        },
        basePrice: Number,
        branches: {
            type: Map,
            of: BranchSchema
        },
        brandDocID: {
            type: String,
            ref: 'Vendor'
        },
        brandID: String,
        carats: Schema.Types.Mixed,
        category: String,
        clarity: Schema.Types.Mixed,
        collection: String,
        color: String,
        customizable: {
            type: Boolean,
            default: false
        },
        description: String,
        diamondQuantity: Schema.Types.Mixed,
        diamondShapes: Schema.Types.Mixed,
        docID: String,
        exactDate: Date,
        frontProduct: {
            type: Boolean,
            default: false
        },
        gender: String,
        goldColor: Schema.Types.Mixed,
        goldKarat: String,
        goldWeight: Schema.Types.Mixed,
        hashtags: {
            type: [String],
            default: []
        },
        images: [String],
        library: [Schema.Types.Mixed],
        metal: String,
        minStock: {
            type: Number,
            default: 0
        },
        name: String,
        plating: String,
        price: Number,
        pricingMethod: String,
        promoted: {
            type: Boolean,
            default: false
        },
        rawTypes: String,
        reviews: {
            type: Number,
            default: 0
        },
        segment: Number,
        serialID: String,
        silverKarat: String,
        weight: Number
    },
    {
        timestamps: true,
        _id: false,
        suppressReservedKeysWarning: true
    }
);

ProductSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Product = (mongoose.models.Product as IProductModel) ||
    mongoose.model<IProduct>('Product', ProductSchema);

export default Product;