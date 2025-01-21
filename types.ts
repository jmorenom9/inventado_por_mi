import {ObjectId, OptionalId} from "mongodb"

export type RestaurantesModel = OptionalId<{
    name: string,
    direccion: string,
    reservas: ObjectId[]
}>

export type ReservasModel = OptionalId<{
    hora: number,
    disponible: boolean,
}>;

export type Restaurante = {
    id?: string,
    name: string,
    direccion: string,
    reservas: Reservas[]
}

export type Reservas = {
    id?: string,
    hora: number,
    disponible: boolean,
}

