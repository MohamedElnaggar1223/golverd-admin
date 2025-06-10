import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IShopVisit extends Document {
    _id: string;
    visitCount: number;
    createdAt: Date;
    updatedAt: Date;
}

interface IShopVisitModel extends Model<IShopVisit> { }

const ShopVisitSchema = new Schema<IShopVisit>(
    {
        _id: {
            type: String,
            required: true,
            default: 'shop_visits' // Single record
        },
        visitCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true,
        _id: false
    }
);

ShopVisitSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const ShopVisit = (mongoose.models.ShopVisit as IShopVisitModel) ||
    mongoose.model<IShopVisit>('ShopVisit', ShopVisitSchema);

export default ShopVisit; 