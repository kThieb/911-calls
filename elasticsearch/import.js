//const elasticsearch = require('elasticsearch');
const csv = require('csv-parser');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');

const ELASTIC_SEARCH_URI = 'http://localhost:9200';
const INDEX_NAME = '911-calls';

async function run() {
  const client = new Client({ node: ELASTIC_SEARCH_URI });

  // Drop index if exists
  await client.indices.delete({
    index: INDEX_NAME,
    ignore_unavailable: true,
  });

  await client.indices.create({
    index: INDEX_NAME,
    body: {
      // TODO configurer l'index https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html
    },
  });

  let calls = [];
  fs.createReadStream('../911.csv')
    .pipe(csv())
    .on('data', (data) => {
      calls.push({
        lat: data.lat,
        lng: data.lng,
        desc: data.desc,
        zip: data.zip,
        title: data.title,
        timeStamp: data.timeStamp,
        twp: data.twp,
        addr: data.addr,
        e: data.e,
      });

      // TODO créer l'objet call à partir de la ligne
    })
    .on('end', async () => {
      client.bulk(createBulkInsertQuery(calls), (err, resp) => {
        if (err) console.trace(err.message);
        else console.log(`Inserted ${resp.body.items.length} calls`);
        client.close();
      });
      // TODO insérer les données dans ES en utilisant l'API de bulk https://www.elastic.co/guide/en/elasticsearch/reference/7.x/docs-bulk.html
    });
}

function createBulkInsertQuery(calls) {
  const body = calls.reduce((acc, call) => {
    const { lat, lng, desc, zip, title, timeStamp, twp, addr, e } = call;
    acc.push({ index: { _index: INDEX_NAME } });
    acc.push({ lat, lng, desc, zip, title, timeStamp, twp, addr, e });
    return acc;
  }, []);

  return { body };
}
run().catch(console.log);
