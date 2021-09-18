if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});
const mongoose = require('mongoose');
const Campground = require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const findCamp = async () => {
    let list = [];
    try {
        let res = await client.placesNearby({
            params: {
                key: process.env.GOOGLE_MAP_API,
                location: {
                    lat: 40.7769453306189,
                    lng: -73.97226263825776
                },
                radius: 15000,
                keyword: "park"
            },
        });
        const places = res.data.results;
        for (let place of places) {
            // const photoRef = place.photos ? place.photos[0].photo_reference : null;
            // const photo = photoRef ? await client.placePhoto({
            //     params: {
            //         key: process.env.GOOGLE_MAP_API,
            //         photoreference: photoRef,
            //         maxheight: 1000,
            //         maxwidth: 1000
            //     }
            // }) : null;
            const detailResponse = await client.placeDetails({
                params: {
                    key: process.env.GOOGLE_MAP_API,
                    place_id: place.place_id
                }
            });
            const detail = detailResponse.data.result;
            const location = await client.reverseGeocode({
                params: {
                    key: process.env.GOOGLE_MAP_API,
                    latlng: {
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng
                    }
                }
            })
            const addr = location.data.results ? location.data.results[0].formatted_address : detail.formatted_address;
            const images = [];
            let count = 0;
            for (let placePhoto of detail.photos) {
                if(count==10) break;
                const photoRef = place.photos ? placePhoto.photo_reference : null;
                const photo = photoRef ? await client.placePhoto({
                    params: {
                        key: process.env.GOOGLE_MAP_API,
                        photoreference: photoRef,
                        maxheight: 1000,
                        maxwidth: 1000
                    }
                }) : null;
                images.push({
                    url: photo ? photo.request.res.responseUrl : "https://source.unsplash.com/collection/9664754",
                    filename: photoRef + count.toString ? photoRef : "nyc"
                })
                count++;
            }
            list.push({
                //YOUR USER ID
                author: '6142cc9e958487515c31dede',
                location: addr,
                title: place.name,
                description: (detail.reviews !== undefined ? detail.reviews[0].text : "This place has no comment now"),
                price: Math.floor(Math.random() * 100),
                geometry: {
                    type: "Point",
                    coordinates: [
                        place.geometry.location.lng,
                        place.geometry.location.lat
                    ]
                },
                images: images
            });
        }
        return list;
    }
    catch (e) {
        throw e;
    }
}

const seedDB = async () => {
    const camps = await findCamp();
    // console.log(camps);
    await Campground.deleteMany({});
    for (let camp of camps) {
        await new Campground(camp).save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
    console.log("Seeding finished")
})