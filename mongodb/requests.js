const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://localhost:27017/';
const DB_NAME = '911-calls';
const COLLECTION_NAME = 'calls';

MongoClient.connect(MONGO_URL, { useNewUrlParser: true }, async (err, client) => {
  if (err) throw err;
  const db = client.db(DB_NAME);
  const calls = db.collection(COLLECTION_NAME);
  const categories = await calls
    .aggregate([{ $group: { _id: '$category', total: { $sum: 1 } } }])
    .toArray();

  console.log(`\nCatégories d'appels`);
  categories.forEach((result) => console.log(result._id, ': ', result.total));

  console.log(`\nTop 3 mois ayant comptabilisés le plus d'appels`);
  const datePipeline = [
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$timeStamp' } },
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 3 },
  ];
  const dates = await calls.aggregate(datePipeline).toArray();

  dates.forEach((result) => console.log(result._id, ': ', result.total));

  console.log(`\nTop 3 des villes avec le plus d'appels pour overdose`);
  const oPipeline = [
    { $match: { categoryDetails: 'OVERDOSE' } },
    { $group: { _id: '$twp', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 3 },
  ];
  const appelsOD = await calls.aggregate(oPipeline).toArray();

  appelsOD.forEach((result) => console.log(result._id, ': ', result.total));

  console.log(`\nNombre d'appels autour de Lansdale dans un rayon de 500 mètres`);

  // decrepated
  const appelsAutourDeLansdale = await calls.count({
    loc: {
      $near: {
        $geometry: { type: 'Point', coordinates: [-75.283783, 40.241493] },
        $maxDistance: 500,
      },
    },
  });

  console.log(appelsAutourDeLansdale);

  client.close();
});
