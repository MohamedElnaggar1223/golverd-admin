import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPosition extends Document {
    _id: string;
    name: string;
    permissions: {
        viewAll: boolean;
        viewDashboard: boolean;
        viewTeamMembers: boolean;
        viewVendors: boolean;
        viewOrders: boolean;
        viewAppointments: boolean;
        viewFinancialCenter: boolean;
        viewUsers: boolean;
        editAll: boolean;
        editTeamMembers: boolean;
        editVendors: boolean;
        editOrders: boolean;
        editAppointments: boolean;
        editFinancialCenter: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

const PositionSchema = new Schema<IPosition>(
    {
        _id: {
            type: String,
            required: true,
            auto: false
        },
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        permissions: {
            viewAll: { type: Boolean, default: false },
            viewDashboard: { type: Boolean, default: true },
            viewTeamMembers: { type: Boolean, default: false },
            viewVendors: { type: Boolean, default: false },
            viewOrders: { type: Boolean, default: false },
            viewAppointments: { type: Boolean, default: false },
            viewFinancialCenter: { type: Boolean, default: false },
            viewUsers: { type: Boolean, default: false },
            editAll: { type: Boolean, default: false },
            editTeamMembers: { type: Boolean, default: false },
            editVendors: { type: Boolean, default: false },
            editOrders: { type: Boolean, default: false },
            editAppointments: { type: Boolean, default: false },
            editFinancialCenter: { type: Boolean, default: false }
        }
    },
    {
        timestamps: true,
        _id: false
    }
);

const Position = (mongoose.models.Position ||
    mongoose.model<IPosition>('Position', PositionSchema)) as Model<IPosition>;

export default Position; 