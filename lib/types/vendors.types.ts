import { IVendor } from "@/models/Vendor";
import { FlattenMaps } from "mongoose";

export type Vendor = FlattenMaps<IVendor> & Required<{
    _id: string;
}> & {
    __v: number;
}