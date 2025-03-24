import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IClient extends Document {
    _id: string;
    code?: string;
    email?: string;
    exactDate: Date;
    id?: string;
    name?: string;
    number?: string;
    vendor?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface IClientModel extends Model<IClient> { }

const ClientSchema = new Schema<IClient>(
    {
        _id: {
            type: String,
            required: true
        },
        code: String,
        email: String,
        exactDate: {
            type: Date,
            default: Date.now
        },
        id: String,
        name: String,
        number: String,
        vendor: {
            type: String,
            ref: 'Vendor'
        }
    },
    {
        timestamps: true,
        _id: false
    }
);

ClientSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Client = (mongoose.models.Client as IClientModel) ||
    mongoose.model<IClient>('Client', ClientSchema);

export default Client;