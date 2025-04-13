// models/Bill.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBill extends Document {
    _id: string;
    vendorId: string;
    month: number;
    year: number;
    rent: number;
    commission: number;
    commissionPercentage: number;
    totalSales: number;
    totalAmount: number;
    status: 'paid' | 'pending' | 'overdue';
    paymentDate?: Date;
    dueDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface IBillModel extends Model<IBill> { }

const BillSchema = new Schema<IBill>(
    {
        _id: {
            type: String,
            required: true,
            auto: false
        },
        vendorId: {
            type: String,
            required: true,
            ref: 'Vendor'
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true
        },
        rent: {
            type: Number,
            required: true,
            default: 0
        },
        commission: {
            type: Number,
            required: true,
            default: 0
        },
        commissionPercentage: {
            type: Number,
            required: true,
            default: 0
        },
        totalSales: {
            type: Number,
            required: true,
            default: 0
        },
        totalAmount: {
            type: Number,
            required: true,
            default: 0
        },
        status: {
            type: String,
            enum: ['paid', 'pending', 'overdue'],
            default: 'pending'
        },
        paymentDate: {
            type: Date
        },
        dueDate: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true,
        _id: false
    }
);

BillSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    // Calculate total amount when saving
    this.totalAmount = this.rent + this.commission;
    next();
});

const Bill = (mongoose.models.Bill as IBillModel) ||
    mongoose.model<IBill>('Bill', BillSchema);

export default Bill; 