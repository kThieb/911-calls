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
      mappings: {
        properties: {
          timeStamp: {
            type: 'date',
            format: 'yyyy-MM-dd HH:mm:ss',
          },
          pin: {
            properties: {
              location: {
                type: 'geo_point',
              },
            },
          },
        },
      },
    },
  });

  let calls = [];
  fs.createReadStream('../911.csv')
    .pipe(csv())
    .on('data', (data) => {
      const category = data.title.slice(0, data.title.indexOf(':'));
      const categoryDetails = data.title.slice(data.title.indexOf(':') + 2);
      calls.push({
        pin: {
          location: {
            lat: +data.lat,
            lon: +data.lng,
          },
        },
        desc: data.desc,
        zip: +data.zip,
        category,
        categoryDetails,
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
    //const { lat, lng, desc, zip, title, timeStamp, twp, addr, e } = call;
    acc.push({ index: { _index: INDEX_NAME } });
    acc.push(call);
    return acc;
  }, []);

  return { body };
}
run().catch(console.log);
