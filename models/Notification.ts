import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    recipient: string;
    recipientType: 'user' | 'superuser';
    sender: string;
    senderType: 'system' | 'user' | 'superuser';
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
    recipient: {
        type: String,
        required: true
    },
    recipientType: {
        type: String,
        enum: ['user', 'superuser'],
        required: true
    },
    sender: {
        type: String,
        required: true
    },
    senderType: {
        type: String,
        enum: ['system', 'user', 'superuser'],
        default: 'system'
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

// Create indexes for faster querying
NotificationSchema.index({ recipient: 1, recipientType: 1 });
NotificationSchema.index({ recipient: 1, recipientType: 1, read: 1 });

// Check if the model already exists to prevent overwriting during hot reloads
const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification; 