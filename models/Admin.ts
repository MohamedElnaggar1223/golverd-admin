import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAdmin extends Document {
    _id: string;
    approval: string;
    brandDocID?: string;
    brandID?: string;
    bundle?: string;
    docID?: string;
    email: string;
    employees: any[];
    firstLogin: boolean;
    firstName?: string;
    id?: string;
    lastName?: string;
    orders: any[];
    password?: string;
    phoneNumber?: string;
    profilePic?: string;
    role: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface IAdminModel extends Model<IAdmin> { }

const AdminSchema = new Schema<IAdmin>(
    {
        _id: {
            type: String,
            required: true,
            auto: false
        },
        approval: {
            type: String,
            default: 'Pending'
        },
        brandDocID: String,
        brandID: String,
        bundle: String,
        docID: String,
        email: {
            type: String,
            required: true,
            unique: true
        },
        employees: [Schema.Types.Mixed],
        firstLogin: {
            type: Boolean,
            default: true
        },
        firstName: String,
        id: String,
        lastName: String,
        orders: [Schema.Types.Mixed],
        password: String,
        phoneNumber: String,
        profilePic: String,
        role: Boolean
    },
    {
        timestamps: true,
        _id: false
    }
);

AdminSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Admin = (mongoose.models.Admin as IAdminModel) ||
    mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;