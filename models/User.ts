// models/User.ts
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

export interface IUser extends Document {
    _id: string;
    addresses: Map<string, IAddress>;
    createdAt: Date;
    defaultAddress?: string;
    email: string;
    firstName?: string;
    gender?: string;
    lastName?: string;
    phone?: string;
    wishlist: string[];
    updatedAt: Date;
}

interface IUserModel extends Model<IUser> { }

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

const UserSchema = new Schema<IUser>(
    {
        _id: {
            type: String,
            required: true
        },
        addresses: {
            type: Map,
            of: AddressSchema
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        defaultAddress: String,
        email: {
            type: String,
            required: true,
            unique: true
        },
        firstName: String,
        gender: String,
        lastName: String,
        phone: String,
        wishlist: {
            type: [String],
            ref: 'Product',
            default: []
        }
    },
    {
        timestamps: true,
        _id: false
    }
);

UserSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const User = (mongoose.models.User as IUserModel) ||
    mongoose.model<IUser>('User', UserSchema);

export default User;