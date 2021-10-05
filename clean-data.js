#!/usr/bin/env node
'use strict';

const {Parser} = require('json2csv');
const fs = require('fs');
const csv = require('csvtojson');
const path = require('path');
const uniqBy = require('lodash.uniqby');

(async () => {

    const BASE_PATH = path.join(
        __dirname,
        `./data`
    )

    // Loop through all the files in the data directory
    // and get the results
    let allRows = [];
    let countryCode = 'RU';
    const files = fs.readdirSync(BASE_PATH);
    for (let file of files) {
        try {
            const rows = await csv()
                .fromFile(`${BASE_PATH}/${file}`);
            allRows = allRows.concat(rows);
        } catch (err) {
            console.error(err);
            process.exit();
        }
    }

    // Get the unique rows based on ID
    const uniqueRows = uniqBy(allRows, 'orig_id');

    // Save as a new cleaned JSON file
    const json2csvParser = new Parser();
    const newCsv = json2csvParser.parse(uniqueRows.map(({
                                                            name,
                                                            orig_id,
                                                            streetAddress,
                                                            state,
                                                            location,
                                                            platinum,
                                                            COUNTRY_NAME
                                                        }) => ({
        name,
        orig_id,
        streetAddress,
        state,
        location,
        platinum,
        COUNTRY_NAME
    })));
    fs.writeFileSync(`./cleaned_data/wu-locations-for-${countryCode}.csv`, newCsv);

    // Save as a GeoJSON file to see where all the locations are - upload to a GIST
    const features = uniqueRows.map(d => {
        const [latitude, longitude] = d.location.split(',');
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude],
                "properties": {
                    id: d.orig_id
                }
            }
        }
    })
    fs.writeFileSync(`./cleaned_data/wu-locations-for-${countryCode}.geojson`, JSON.stringify({
        "type": "FeatureCollection",
        features
    }));

    // Exit when complete
    process.exit();
})()
