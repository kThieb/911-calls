const { MongoClient } = require('mongodb');
const csv = require('csv-parser');
const fs = require('fs');
const { mainModule } = require('process');
const { timeStamp } = require('console');

const MONGO_URL = 'mongodb://localhost:27017/';
const DB_NAME = '911-calls';
const COLLECTION_NAME = 'calls';

const insertCalls = async function (db, callback) {
  const collection = db.collection(COLLECTION_NAME);
  await dropCollectionIfExists(db, collection);

  const calls = [];
  fs.createReadStream('../911.csv')
    .pipe(csv())
    .on('data', (data) => {
      const category = data.title.slice(0, data.title.indexOf(':'));
      const categoryDetails = data.title.slice(data.title.indexOf(':') + 2);
      const date = new Date(data.timeStamp.replace(' ', 'T'));
      const call = {
        desc: data.desc,
        twp: data.twp,
        addr: data.addr,
        timeStamp: new Date(date),
        category,
        categoryDetails,
        loc: { type: 'Point', coordinates: [+data.lng, +data.lat] },
        zip: +data.zip,
        e: +data.e,
      }; // TODO créer l'objet call à partir de la ligne
      calls.push(call);
    })
    .on('end', async () => {
      console.log(calls[0]);
      collection.insertMany(calls, (err, result) => {
        callback(result);
      });
      const result = await collection.createIndex({ loc: '2dsphere' });
      console.log(`Index created: ${result}`);
    });
};

MongoClient.connect(
  MONGO_URL,
  {
    useUnifiedTopology: true,
  },
  (err, client) => {
    if (err) {
      console.error(err);
      throw err;
    }
    const db = client.db(DB_NAME);
    insertCalls(db, (result) => {
      console.log(`${result.insertedCount} calls inserted`);
      client.close();
    });
  }
);

async function dropCollectionIfExists(db, collection) {
  const matchingCollections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
  if (matchingCollections.length > 0) {
    await collection.drop();
  }
}
