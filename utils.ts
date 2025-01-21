import { Collection } from "mongodb";
import { ReservasModel, RestaurantesModel } from "./types.ts";
import { Restaurante } from "./types.ts";

export const fromModelToRestaurante = async (model: RestaurantesModel, ReservasCollection: Collection<ReservasModel>): Promise<Restaurante | null> => {
    const reservas = await ReservasCollection.find({_id: {$in: model.reservas}}).toArray();
    return {
        id: model._id?.toString(),
        name: model.name,
        direccion: model.direccion,
        reservas: reservas.map((elem) => fromModelToReserva(elem))
    }
}

export const fromModelToReserva = (model: ReservasModel) => ({
        id: model._id?.toString(),
        hora: model.hora,
        disponible: model.disponible
});