import mongoose, { Document, Model, Schema } from 'mongoose';
import { compare, hash } from 'bcrypt';

export interface ISuperUser extends Document {
    _id: string;
    email: string;
    password: string;
    name: string;
    isBusinessOwner: boolean;
    profilePicture?: string;
    positionId?: string;
    position?: any; // Populated field
    accountsManaged: string[]; // Array of vendor IDs
    phoneNumber?: string;
    role: 'admin' | 'super';
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    validatePassword(password: string): Promise<boolean>;
}

interface ISuperUserModel extends Model<ISuperUser> {
    findByEmail(email: string): Promise<ISuperUser | null>;
}

const SuperUserSchema = new Schema<ISuperUser>(
    {
        _id: {
            type: String,
            required: true,
            auto: false
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        isBusinessOwner: {
            type: Boolean,
            default: false
        },
        profilePicture: {
            type: String,
            default: ''
        },
        positionId: {
            type: String,
            ref: 'Position',
        },
        accountsManaged: [{
            type: String,
            ref: 'Vendor'
        }],
        phoneNumber: {
            type: String,
            default: ''
        },
        role: {
            type: String,
            enum: ['admin', 'super'],
            default: 'admin'
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastLogin: Date
    },
    {
        timestamps: true,
        _id: false,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for position
SuperUserSchema.virtual('position', {
    ref: 'Position',
    localField: 'positionId',
    foreignField: '_id',
    justOne: true,
});

// Hash password before saving
SuperUserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        this.password = await hash(this.password, 10);
        this.updatedAt = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Method to validate password
SuperUserSchema.methods.validatePassword = async function (password: string): Promise<boolean> {
    return compare(password, this.password);
};

// Static method to find by email
SuperUserSchema.statics.findByEmail = function (email: string) {
    return this.findOne({ email });
};

// Check if model exists before creating
const SuperUser = (mongoose.models.SuperUser as unknown as ISuperUserModel) ||
    mongoose.model<ISuperUser, ISuperUserModel>('SuperUser', SuperUserSchema);

export default SuperUser; 