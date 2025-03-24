// models/UserOrder.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

interface IAddress {
    address?: string;
    apartment?: string;
    city?: string;
    country?: string;
    firstName?: string;
    governate?: string;
    lastName?: string;
    phoneNumber?: string;
    postalCode?: string;
}

interface IPrice {
    delivery: number;
    discount: number;
    subtotal: number;
    total: number;
}

interface IBranch {
    inStock: number;
    revenue: number;
    sold: number;
}

interface IOrderProduct {
    basePrice?: number;
    branches?: Map<string, IBranch>;
    brandDocID?: string;
    brandID?: string;
    carats?: any;
    category?: string;
    clarity?: any;
    collection?: string;
    color?: string;
    customizable?: boolean;
    description?: string;
    diamondQuantity?: any;
    diamondShapes?: any;
    docID?: string;
    exactDate?: any;
    frontProduct?: boolean;
    gender?: string;
    goldColor?: any;
    goldKarat?: string;
    goldWeight?: any;
    hashtags?: string[];
    id?: string;
    images?: string[];
    library?: any[];
    metal?: string;
    minStock?: number;
    name?: string;
    plating?: string;
    price?: number;
    pricingMethod?: string;
    promoted?: boolean;
    rawTypes?: string;
    reviews?: number;
    segment?: number;
    serialID?: string;
    silverKarat?: string;
    weight?: number;
}

interface IOrderItem {
    product: IOrderProduct;
    quantity: number;
}

export interface IUserOrder extends Document {
    _id: string;
    address: IAddress;
    createdAt: Date;
    estimatedArrival?: Date;
    paymentMethod?: string;
    price: IPrice;
    products: IOrderItem[];
    status: string;
    userId: string;
    updatedAt: Date;
}

interface IUserOrderModel extends Model<IUserOrder> { }

const AddressSchema = new Schema<IAddress>(
    {
        address: String,
        apartment: String,
        city: String,
        country: String,
        firstName: String,
        governate: String,
        lastName: String,
        phoneNumber: String,
        postalCode: String
    },
    { _id: false }
);

const PriceSchema = new Schema<IPrice>(
    {
        delivery: Number,
        discount: Number,
        subtotal: Number,
        total: Number
    },
    { _id: false }
);

const BranchSchema = new Schema<IBranch>(
    {
        inStock: {
            type: Number,
            default: 0
        },
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

const OrderProductSchema = new Schema<IOrderProduct>(
    {
        basePrice: Number,
        branches: {
            type: Map,
            of: BranchSchema
        },
        brandDocID: String,
        brandID: String,
        carats: Schema.Types.Mixed,
        category: String,
        clarity: Schema.Types.Mixed,
        collection: String,
        color: String,
        customizable: Boolean,
        description: String,
        diamondQuantity: Schema.Types.Mixed,
        diamondShapes: Schema.Types.Mixed,
        docID: String,
        exactDate: Schema.Types.Mixed,
        frontProduct: Boolean,
        gender: String,
        goldColor: Schema.Types.Mixed,
        goldKarat: String,
        goldWeight: Schema.Types.Mixed,
        hashtags: [String],
        id: String,
        images: [String],
        library: [Schema.Types.Mixed],
        metal: String,
        minStock: Number,
        name: String,
        plating: String,
        price: Number,
        pricingMethod: String,
        promoted: Boolean,
        rawTypes: String,
        reviews: Number,
        segment: Number,
        serialID: String,
        silverKarat: String,
        weight: Number
    },
    { _id: false, suppressReservedKeysWarning: true }
);

const OrderItemSchema = new Schema<IOrderItem>(
    {
        product: OrderProductSchema,
        quantity: Number
    },
    { _id: false }
);

const UserOrderSchema = new Schema<IUserOrder>(
    {
        _id: {
            type: String,
            required: true,
            auto: false
        },
        address: AddressSchema,
        createdAt: {
            type: Date,
            default: Date.now
        },
        estimatedArrival: Date,
        paymentMethod: String,
        price: PriceSchema,
        products: [OrderItemSchema],
        status: {
            type: String,
            default: 'pending'
        },
        userId: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true,
        _id: false
    }
);

UserOrderSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const UserOrder = (mongoose.models.UserOrder as IUserOrderModel) ||
    mongoose.model<IUserOrder>('UserOrder', UserOrderSchema);

export default UserOrder;