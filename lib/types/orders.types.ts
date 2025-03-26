import { IOrder } from "@/models/Order";
import { FlattenMaps } from "mongoose";

export type Order = FlattenMaps<IOrder> & Required<{
    _id: string;
}> & {
    __v: number;
}

export type OrderItem = FlattenMaps<IOrder> & Required<{
    _id: string;
    vendorID: {
        _id: string;
        name: string;
    }
}> & {
    __v: number;
}
