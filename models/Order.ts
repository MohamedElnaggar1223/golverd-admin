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

interface IChargeItem {
    price: number;
    quantity: number;
}

export interface IOrder extends Document {
    _id: string;
    address: IAddress;
    branch?: string;
    charges: Map<string, IChargeItem>;
    clientEmail?: string;
    clientID?: string;
    clientName?: string;
    clientPhoneNumber?: string;
    deliveryDate?: {
        _seconds: number;
        _nanoseconds: number;
    };
    id?: string;
    invoice?: number;
    items: Map<string, number>;
    orderDate: {
        _seconds: number;
        _nanoseconds: number;
    };
    paymentMethod?: string;
    price?: number;
    promocode?: string;
    status: string;
    saleStatus?: string;
    vendorID?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface IOrderModel extends Model<IOrder> { }

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

const ChargeItemSchema = new Schema<IChargeItem>(
    {
        price: Number,
        quantity: Number
    },
    { _id: false }
);

const OrderSchema = new Schema<IOrder>(
    {
        _id: {
            type: String,
            required: true
        },
        address: AddressSchema,
        branch: String,
        charges: {
            type: Map,
            of: ChargeItemSchema
        },
        clientEmail: String,
        clientID: {
            type: String,
            ref: 'User'
        },
        clientName: String,
        clientPhoneNumber: String,
        deliveryDate: {
            _seconds: Number,
            _nanoseconds: Number
        },
        id: String,
        invoice: Number,
        items: {
            type: Map,
            of: Number
        },
        orderDate: {
            _seconds: Number,
            _nanoseconds: Number
        },
        paymentMethod: String,
        price: Number,
        promocode: String,
        status: {
            type: String,
            default: 'pending'
        },
        saleStatus: {
            type: String,
            default: 'No Sale',
            enum: ['No Sale', 'Sold']
        },
        vendorID: {
            type: String,
            ref: 'Vendor'
        }
    },
    {
        timestamps: true,
        _id: false
    }
);

OrderSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Order = (mongoose.models.Order as IOrderModel) ||
    mongoose.model<IOrder>('Order', OrderSchema);

export default Order;