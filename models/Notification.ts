import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    recipient: string;
    sender: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
    recipient: {
        type: String,
        ref: 'SuperUser',
        required: true
    },
    sender: {
        type: String,
        ref: 'SuperUser',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Check if the model already exists to prevent overwriting during hot reloads
const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification; 