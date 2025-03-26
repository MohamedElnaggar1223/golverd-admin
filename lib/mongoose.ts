import mongoose from "mongoose";
import '../models/User'
import '../models/Vendor'
import '../models/Order'
import '../models/Notification'
import '../models/Position'
import '../models/SuperUser'
import '../models/Product'
import '../models/Appointment'

let isConnected = false

export const connectDB = async () => {
    mongoose.set('strictQuery', true)
    mongoose.set('strictPopulate', false)

    if (!process.env.MONGO_URI) return console.error('No MONGO_URI env variable set')
    if (isConnected) return console.log('Already connected to MongoDB')

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000
        })

        isConnected = true

        console.log('Connected to MongoDB')
    }
    catch (e) {
        console.error(e)
    }
}