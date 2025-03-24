import { FlattenMaps } from "mongoose";
import { ISuperUser } from "@/models/SuperUser";
import { IPosition } from "@/models/Position";

export type TeamMember = (FlattenMaps<ISuperUser> & Required<{
    _id: string;
}> & {
    __v: number;
}) | null

export type Position = (FlattenMaps<IPosition> & Required<{
    _id: string;
}> & {
    __v: number;
}) | null
