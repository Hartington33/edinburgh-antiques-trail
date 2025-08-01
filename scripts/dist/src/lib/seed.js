"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
var schema_1 = require("./schema");
function seedDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var db, neighborhoods, _i, neighborhoods_1, n, error_1, placeTypes, _a, placeTypes_1, pt, error_2, places, _b, places_1, place, error_3;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, schema_1.initializeDatabase)()];
                case 1:
                    db = _c.sent();
                    neighborhoods = [
                        { name: 'Old Town', description: 'Historic heart of Edinburgh, featuring Edinburgh Castle and the Royal Mile.' },
                        { name: 'New Town', description: 'Georgian era planned development with neoclassical architecture.' },
                        { name: 'Stockbridge', description: 'Bohemian village-like area with independent shops and cafes.' },
                        { name: 'Leith', description: 'Vibrant port district with a rich maritime history.' },
                        { name: 'Bruntsfield', description: 'Upmarket residential area with specialty shops and cafes.' },
                        { name: 'Morningside', description: 'Affluent residential area with boutique shops.' },
                        { name: 'Grassmarket', description: 'Historic marketplace with views of Edinburgh Castle.' },
                        { name: 'Dean Village', description: 'Picturesque former grain milling village by the Water of Leith.' },
                        { name: 'Marchmont', description: 'Residential area popular with students and young professionals.' },
                        { name: 'Newington', description: 'Diverse area with many restaurants and student accommodation.' }
                    ];
                    _i = 0, neighborhoods_1 = neighborhoods;
                    _c.label = 2;
                case 2:
                    if (!(_i < neighborhoods_1.length)) return [3 /*break*/, 7];
                    n = neighborhoods_1[_i];
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, db.run('INSERT INTO neighborhoods (name, description) VALUES (?, ?)', n.name, n.description)];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _c.sent();
                    console.log("Skipping duplicate neighborhood: ".concat(n.name));
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    placeTypes = [
                        { name: 'Antique Shop', description: 'Shops selling antique furniture, decorative items, and collectibles.' },
                        { name: 'Auction House', description: 'Establishments that conduct auctions of antiques and collectibles.' },
                        { name: 'Second-hand Book Shop', description: 'Shops specializing in used, rare, and antiquarian books.' },
                        { name: 'Record Shop', description: 'Shops selling vinyl records, including rare and vintage recordings.' },
                        { name: 'Vintage Clothing Shop', description: 'Shops specializing in period clothing and accessories.' },
                        { name: 'Antique Fair', description: 'Regular or periodic events featuring multiple antique dealers.' }
                    ];
                    _a = 0, placeTypes_1 = placeTypes;
                    _c.label = 8;
                case 8:
                    if (!(_a < placeTypes_1.length)) return [3 /*break*/, 13];
                    pt = placeTypes_1[_a];
                    _c.label = 9;
                case 9:
                    _c.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, db.run('INSERT INTO place_types (name, description) VALUES (?, ?)', pt.name, pt.description)];
                case 10:
                    _c.sent();
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _c.sent();
                    console.log("Skipping duplicate place type: ".concat(pt.name));
                    return [3 /*break*/, 12];
                case 12:
                    _a++;
                    return [3 /*break*/, 8];
                case 13:
                    places = [
                        {
                            name: 'Georgian Antiques',
                            address: '10 Pattison Street, Leith, Edinburgh EH6 7HF',
                            phone: '0131 553 7286',
                            email: 'info@georgianantiques.net',
                            website: 'https://www.georgianantiques.net/',
                            description: 'One of the largest antique warehouses in Britain with over 50,000 items across two floors.',
                            specialties: 'Georgian, Victorian and Edwardian furniture, lighting, and decorative items',
                            opening_hours: 'Mon-Fri: 10:00-17:00, Sat: 10:00-16:00, Sun: Closed',
                            lat: 55.9757,
                            lng: -3.1776,
                            type_id: 1, // Antique Shop
                            neighborhood_id: 4 // Leith
                        },
                        {
                            name: 'Lyon & Turnbull',
                            address: '33 Broughton Place, Edinburgh EH1 3RR',
                            phone: '0131 557 8844',
                            email: 'info@lyonandturnbull.com',
                            website: 'https://www.lyonandturnbull.com/',
                            description: 'Scotland\'s oldest auction house founded in 1826, now specializing in fine art and antiques.',
                            specialties: 'Fine art, jewelry, decorative arts, Scottish antiques, Asian art',
                            opening_hours: 'Mon-Fri: 9:00-17:00, Viewings by appointment',
                            lat: 55.9586,
                            lng: -3.1890,
                            type_id: 2, // Auction House
                            neighborhood_id: 2 // New Town
                        },
                        {
                            name: 'Armchair Books',
                            address: '72-74 West Port, Edinburgh EH1 2LE',
                            phone: '0131 229 5927',
                            email: 'info@armchairbooks.co.uk',
                            website: 'https://www.armchairbooks.co.uk/',
                            description: 'A charming second-hand bookshop with floor to ceiling shelves and a great selection of rare books.',
                            specialties: 'Rare books, first editions, Scottish literature, philosophy',
                            opening_hours: 'Mon-Sat: 10:00-18:30, Sun: 12:00-18:00',
                            lat: 55.9467,
                            lng: -3.1986,
                            type_id: 3, // Second-hand Book Shop
                            neighborhood_id: 7 // Grassmarket
                        },
                        {
                            name: 'VoxBox Music',
                            address: '21 St Stephen Street, Edinburgh EH3 5AN',
                            phone: '0131 629 6775',
                            email: 'contact@voxboxmusic.co.uk',
                            website: 'https://www.voxboxmusic.co.uk/',
                            description: 'Independent record store specializing in new and second-hand vinyl.',
                            specialties: 'Vinyl records, indie music, classic rock, jazz, soul',
                            opening_hours: 'Mon-Sat: 10:00-18:00, Sun: 12:00-17:00',
                            lat: 55.9572,
                            lng: -3.2089,
                            type_id: 4, // Record Shop
                            neighborhood_id: 3 // Stockbridge
                        },
                        {
                            name: 'Armstrong\'s Vintage',
                            address: '83 Grassmarket, Edinburgh EH1 2HJ',
                            phone: '0131 220 5557',
                            email: 'info@armstrongsvintage.co.uk',
                            website: 'https://www.armstrongsvintage.co.uk/',
                            description: 'Edinburgh\'s oldest vintage clothing store, operating since 1840.',
                            specialties: 'Vintage clothing from 1920s-1990s, accessories, costumes',
                            opening_hours: 'Mon-Sat: 10:00-18:00, Sun: 11:00-17:00',
                            lat: 55.9471,
                            lng: -3.1972,
                            type_id: 5, // Vintage Clothing Shop
                            neighborhood_id: 7 // Grassmarket
                        },
                        {
                            name: 'Edinburgh Antiques & Collectors Fair',
                            address: 'Royal Highland Centre, Ingliston, Edinburgh EH28 8NB',
                            phone: '01636 702326',
                            email: 'info@antiquesfairs.com',
                            website: 'https://www.antiquesfairs.com/',
                            description: 'One of Scotland\'s largest antiques fairs with over 300 exhibitors.',
                            specialties: 'Furniture, ceramics, glass, silver, jewelry, art, collectibles',
                            opening_hours: 'Check website for dates. Usually 10:00-16:30',
                            lat: 55.9422,
                            lng: -3.3686,
                            type_id: 6, // Antique Fair
                            neighborhood_id: 1 // Using Old Town as default, though it's outside the city center
                        },
                        {
                            name: 'McNaughtan\'s Bookshop',
                            address: '3a-4a Haddington Place, Edinburgh EH7 4AE',
                            phone: '0131 556 5897',
                            email: 'info@mcnaughtansbookshop.com',
                            website: 'https://www.mcnaughtansbookshop.com/',
                            description: 'Scotland\'s oldest antiquarian bookshop established in 1957.',
                            specialties: 'Antiquarian books, Scottish history, literature, fine bindings',
                            opening_hours: 'Tue-Sat: 11:00-17:00, Sun-Mon: Closed',
                            lat: 55.9579,
                            lng: -3.1818,
                            type_id: 3, // Second-hand Book Shop
                            neighborhood_id: 2 // New Town
                        },
                        {
                            name: 'Miss Katie Cupcake',
                            address: '53 Cockburn Street, Edinburgh EH1 1BS',
                            phone: '0131 629 0809',
                            email: 'hello@misskatiescupcake.co.uk',
                            website: 'https://www.misskatiescupcake.co.uk/',
                            description: 'Boutique selling vintage-inspired jewelry and unique gifts.',
                            specialties: 'Handmade jewelry, vintage homewares, accessories',
                            opening_hours: 'Mon-Sat: 10:00-18:00, Sun: 11:00-17:00',
                            lat: 55.9509,
                            lng: -3.1891,
                            type_id: 5, // Vintage Clothing Shop (closest match)
                            neighborhood_id: 1 // Old Town
                        },
                        {
                            name: 'Mr Wood\'s Fossils',
                            address: '5 Cowgatehead, Edinburgh EH1 1JY',
                            phone: '0131 220 1344',
                            email: 'fossil@woodsfossils.com',
                            website: 'https://www.mrwoodsfossils.co.uk/',
                            description: 'Specialist shop selling fossils, minerals, and meteorites since 1987.',
                            specialties: 'Fossils, minerals, crystals, meteorites',
                            opening_hours: 'Mon-Sat: 10:00-17:30, Sun: 11:00-17:00',
                            lat: 55.9477,
                            lng: -3.1943,
                            type_id: 1, // Antique Shop (closest match)
                            neighborhood_id: 1 // Old Town
                        }
                    ];
                    _b = 0, places_1 = places;
                    _c.label = 14;
                case 14:
                    if (!(_b < places_1.length)) return [3 /*break*/, 19];
                    place = places_1[_b];
                    _c.label = 15;
                case 15:
                    _c.trys.push([15, 17, , 18]);
                    return [4 /*yield*/, db.run("\n        INSERT INTO places (\n          name, address, phone, email, website, description, \n          specialties, opening_hours, lat, lng, type_id, neighborhood_id\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", place.name, place.address, place.phone, place.email, place.website, place.description, place.specialties, place.opening_hours, place.lat, place.lng, place.type_id, place.neighborhood_id)];
                case 16:
                    _c.sent();
                    return [3 /*break*/, 18];
                case 17:
                    error_3 = _c.sent();
                    console.log("Error inserting place: ".concat(place.name), error_3);
                    return [3 /*break*/, 18];
                case 18:
                    _b++;
                    return [3 /*break*/, 14];
                case 19:
                    console.log('Database seeded with sample data');
                    return [2 /*return*/];
            }
        });
    });
}
// Close the database connection
// Not needed with better-sqlite3 as it closes automatically when the program exits
