import { HostAddress, ObjectId } from "mongodb";
import { RestaurantesCollection } from "./main.ts";
import { ReservasCollection } from "./main.ts";
import { fromModelToReserva, fromModelToRestaurante } from "./utils.ts";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const method = req.method;
        const url = new URL(req.url);
        const path = url.pathname;

        if (method === "POST") {
            if (path === "/reserva") {
                const reserva = await req.json();
                if (!reserva) return new Response("Bad request", {status: 400});
                if (!reserva.hora) return new Response("Faltan argumentos", {status: 400});
                const reservaExiste = await ReservasCollection.countDocuments({hora: reserva.hora});
                if (reservaExiste === 1) return new Response("La reserva ya existe", {status: 404});
                const {insertedId} = await ReservasCollection.insertOne({
                    hora: reserva.hora,
                    disponible: true
                });
                return new Response(JSON.stringify({id: insertedId, hora: reserva.hora, disponible: true}), {status: 200});
            }

            if (path === "/restaurante") {
                const restaurante = await req.json();
                if (!restaurante) return new Response("Bad request", {status: 400});
                if (!restaurante.name || !restaurante.direccion) return new Response("Faltan argumentos", {status: 400});
                const restauranteExiste = await ReservasCollection.countDocuments({name: restaurante.name});
                if (restauranteExiste === 1) return new Response("El restaurante ya existe", {status: 404});
                /*const rerservaExiste = await ReservasCollection.findOne({_id: new ObjectId(restaurante.reserva as string)});
                if (!rerservaExiste) return new Response("No existe la reserva", {status: 404});
                const comprobarReserva = await ReservasCollection.findOne({disponible:true, _id: {$eq: new ObjectId(restaurante.reserva as string)}});*/
                const {insertedId} = await RestaurantesCollection.insertOne({
                    name: restaurante.name,
                    direccion: restaurante.direccion,
                    reservas: []
                });
                return new Response(JSON.stringify({id: insertedId, name: restaurante.name, direccion: restaurante.direccion, reservas: []}));
            }
        }

        if (method === "PUT") {
            if (path === "/reserva") {
                const reserva = await req.json();
                if (!reserva) return new Response("Bad request", {status: 400});
                if (!reserva.id) return new Response("Debe estar el id y al menos hora o disponible", {status: 400});
                const reservaExiste = await ReservasCollection.findOne({_id: new ObjectId(reserva.id as string)});
                if (!reservaExiste) return new Response("No existe la reserva", {status: 404});
                if (reserva.hora) {
                    const horaOcupada = await ReservasCollection.findOne({hora: reserva.hora, _id: {$ne: new ObjectId(reserva.id as string)}});
                    if (horaOcupada) return new Response("La hora ya la tiene otra reserva", {status: 404});
                    const updateReserva = await ReservasCollection.findOneAndUpdate({_id: new ObjectId(reserva.id as string)}, {
                        $set: {
                            hora: reserva.hora,
                            disponible: reserva.disponible
                        }
                    });
                    return new Response(JSON.stringify(updateReserva), {status: 200});
                }   
                const updateReserva = await ReservasCollection.findOneAndUpdate({_id: new ObjectId(reserva.id as string)}, {
                    $set: {
                        hora: reservaExiste.hora,
                        disponible: reserva.disponible || reservaExiste.disponible
                    }
                });
                return new Response(JSON.stringify(updateReserva), {status: 200});
            }

            if (path === "/restaurante") {
                const restaurante = await req.json();
                if (!restaurante) return new Response("Bad request", {status: 400});
                if (!restaurante.id) return new Response("Debe estar el id y al menos un argumento", {status: 400});
                if (!restaurante.name && !restaurante.direccion && !restaurante.reservas) return new Response("al menos un argumento", {status: 400});
                const restauranteExiste = await RestaurantesCollection.findOne({_id: new ObjectId(restaurante.id as string)});
                if (!restauranteExiste) return new Response("NO existe el restaurante", {status: 404});


                if (restaurante.name || restaurante.direccion) {
                    const updateRestaurante = await RestaurantesCollection.updateOne({_id: new ObjectId(restaurante.id as string)}, {
                        $set: {
                            name: restaurante.name || restauranteExiste.name,
                            direccion: restaurante.direccion || restauranteExiste.direccion
                        }
                    });
                    return new Response(JSON.stringify(updateRestaurante), {status: 200});
                }
                
                if (restaurante.reservas) {
                    const allReservas = await restaurante.reservas.map((elem: string) => new ObjectId(elem));
                    const comprobarReservas = await ReservasCollection.find({_id: {$in: allReservas}, disponible: true}).toArray();
                    if (comprobarReservas.length !== allReservas.length) return new Response("Alguna reserva no existe o no esta disponible", {status: 404});

                    const quitarDisponibilidad = await ReservasCollection.updateMany({_id: {$in: allReservas}}, {
                        $set: {
                            disponible: false
                        }
                    })
                    
                    const updateRestaurante = await RestaurantesCollection.updateOne({_id: new ObjectId(restaurante.id as string)}, {
                        $set: {
                            name: restaurante.name || restauranteExiste.name,
                            direccion: restaurante.direccion || restauranteExiste.direccion
                        },
                        $addToSet: {
                            reservas: {$each: allReservas}
                        }
                    });
                    return new Response(JSON.stringify(updateRestaurante), {status: 200});                
                }
            }

            if (path === "/reservar") {
                const reserva = await req.json();
                if (!reserva) return new Response("Bad request", {status: 400});
                if (!reserva.id_reserva && !reserva.id_restaurante) return new Response("Faltan argumentos", {status: 400});
                const reservaExiste = await ReservasCollection.findOne({_id: new ObjectId(reserva.id_reserva as string), disponible: true});
                if (!reservaExiste) return new Response("La reserva no existe o no esta disponible", {status: 404});
                const restauranteExiste = await RestaurantesCollection.findOne({_id: new ObjectId(reserva.id_restaurante as string)});
                if (!restauranteExiste) return new Response("El restaurante no existe", {status: 404});
                const updateRestaurante = await RestaurantesCollection.updateOne({_id: new ObjectId(reserva.id_restaurante as string)}, {
                    $push: {
                        reservas: new ObjectId(reserva.id_reserva as string)
                    }
                })
                const updateReserva = await ReservasCollection.updateOne({_id: new ObjectId(reserva.id_reserva as string)}, {
                    $set: {
                        disponible: false
                    }
                });
                return new Response(JSON.stringify(updateReserva), {status: 200});
            }
        }

        if (method === "GET") {
            if (path === "/reservas") {
                const allReservas = await ReservasCollection.find().toArray();
                const reservas = allReservas.map((elem) => fromModelToReserva(elem));
                return new Response(JSON.stringify(reservas), {status: 200});
            }

            if (path === "/restaurantes") {
                const allRestaurantes = await RestaurantesCollection.find().toArray();
                const restaurantes = await Promise.all(
                    allRestaurantes.map((elem) => fromModelToRestaurante(elem, ReservasCollection))
                );
                return new Response(JSON.stringify(restaurantes), {status: 200});
            }

            if (path === "/reserva") {
                const id = url.searchParams.get("id");
                if (!id) return new Response("Debe haber id en la url", {status: 400});
                const reserva = await ReservasCollection.findOne({_id: new ObjectId(id as string)});
                if (!reserva) return new Response("No existe la reserva", {status: 404});
                return new Response(JSON.stringify(fromModelToReserva(reserva)), {status: 200});
            }

            if (path === "/restaurante") {
                const id = url.searchParams.get("id");
                if (!id) return new Response("Debe haber id en la url", {status: 400});
                const restaurante = await RestaurantesCollection.findOne({_id: new ObjectId(id as string)});
                if (!restaurante) return new Response(JSON.stringify("No existe el restaurante"), {status: 404});
                return new Response(JSON.stringify(await fromModelToRestaurante(restaurante, ReservasCollection)), {status: 200});
            }
        }

        if (method === "DELETE") {
            if (path === "/reserva") {
                const id = url.searchParams.get("id");
                if (!id) return new Response("Debe haber id en la url", {status: 400});
                const eliminarReservaEnRestaurante = await RestaurantesCollection.findOneAndUpdate({reservas: new ObjectId(id)}, {
                    $pull: {
                        reservas: id
                    }
                });
                const {deletedCount} = await ReservasCollection.deleteOne({_id: new ObjectId(id)});
                if (!deletedCount) return new Response(JSON.stringify(false), {status: 404});
                return new Response(JSON.stringify(true), {status: 200});
            }

            if (path === "/restaurante") {
                const id = url.searchParams.get("id");
                if (!id) return new Response("Debe haber id en la url", {status: 400});
                const {deletedCount} = await RestaurantesCollection.deleteOne({_id: new ObjectId(id)});
                if (!deletedCount) return new Response(JSON.stringify(false), {status: 404});
                return new Response(JSON.stringify(true), {status: 200});
            }
        }       
    
        return new Response(`No se encuentra la ruta ${path}`, {status: 500});
    
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}