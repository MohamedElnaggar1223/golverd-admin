// models/Appointment.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

interface IBranchInfo {
    address?: string;
    inStock: number;
    phoneNumbers: string[];
    revenue: number;
    sold: number;
}

export interface IAppointment extends Document {
    _id: string;
    branch?: string;
    branchInfo: IBranchInfo;
    clientName?: string;
    clientNumber?: string;
    date?: string;
    exactDate?: {
        _seconds: number;
        _nanoseconds: number;
    };
    id?: string;
    productId?: string;
    productImage?: string;
    productName?: string;
    productPrice?: number;
    saleStatus?: string;
    status: string;
    time?: string;
    userId?: string;
    vendorId?: string;
    vendorName?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface IAppointmentModel extends Model<IAppointment> { }

const BranchInfoSchema = new Schema<IBranchInfo>(
    {
        address: String,
        inStock: {
            type: Number,
            default: 0
        },
        phoneNumbers: {
            type: [String],
            default: []
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

const AppointmentSchema = new Schema<IAppointment>(
    {
        _id: {
            type: String,
            required: true
        },
        branch: String,
        branchInfo: BranchInfoSchema,
        clientName: String,
        clientNumber: String,
        date: String,
        exactDate: {
            _seconds: Number,
            _nanoseconds: Number
        },
        id: String,
        productId: String,
        productImage: String,
        productName: String,
        productPrice: Number,
        saleStatus: {
            type: String,
            enum: ['Sold', 'No Sale', null],
            default: null
        },
        status: {
            type: String,
            default: 'upcoming'
        },
        time: String,
        userId: String,
        vendorId: String,
        vendorName: String
    },
    {
        timestamps: true,
        _id: false
    }
);

AppointmentSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Appointment = (mongoose.models.Appointment as IAppointmentModel) ||
    mongoose.model<IAppointment>('Appointment', AppointmentSchema);

export default Appointment;